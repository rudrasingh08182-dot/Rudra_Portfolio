(() => {
  const canvas = document.getElementById('digital-identity-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const cyber = new Image();
  const human = new Image();
  cyber.src = 'assets/rudra-cyborg.png';
  human.src = 'assets/rudra-portrait-transparent.png';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: -9999, y: -9999, active: false };
  let particles = [], width = 0, height = 0, dpr = 1, scrollProgress = 0, raf = 0;
  const revealCanvas = document.createElement('canvas');
  const revealCtx = revealCanvas.getContext('2d');
  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function coverImage(image, targetCtx, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale, sh = h / scale;
    const sx = (image.width - sw) / 2, sy = (image.height - sh) / 2;
    targetCtx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
  }
  function buildParticles() {
    if (!cyber.complete || !cyber.naturalWidth || !width || !height) return;
    const sw = 210, sh = Math.round(sw * height / width);
    sampleCanvas.width = sw; sampleCanvas.height = sh;
    sampleCtx.clearRect(0, 0, sw, sh); coverImage(cyber, sampleCtx, sw, sh);
    const pixels = sampleCtx.getImageData(0, 0, sw, sh).data;
    particles = [];
    for (let y = 2; y < sh; y += 2) {
      for (let x = 2; x < sw; x += 2) {
        const i = (y * sw + x) * 4;
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const brightness = (r + g + b) / 3;
        if (brightness < 25) continue;
        const orange = r > g * 1.28 && g > b * 1.12;
        particles.push({ x: x / sw * width, y: y / sh * height, ox: x / sw * width, oy: y / sh * height,
          color: orange ? `rgba(235,126,35,${0.55 + Math.random()*0.4})` : `rgba(${Math.min(255,r+20)},${Math.min(255,g+20)},${Math.min(255,b+20)},${0.45 + Math.random()*0.45})`,
          size: 0.55 + Math.random()*1.15, phase: Math.random()*Math.PI*2 });
      }
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    revealCanvas.width = canvas.width; revealCanvas.height = canvas.height;
    revealCtx.setTransform(dpr,0,0,dpr,0,0);
    buildParticles();
  }
  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left; pointer.y = e.clientY - rect.top; pointer.active = true;
  }
  canvas.addEventListener('pointermove', setPointer, { passive:true });
  canvas.addEventListener('pointerdown', e => { setPointer(e); canvas.setPointerCapture?.(e.pointerId); }, { passive:true });
  canvas.addEventListener('pointerleave', () => { pointer.active = false; }, { passive:true });
  canvas.addEventListener('pointerup', () => { pointer.active = false; }, { passive:true });

  function updateScroll() {
    const hero = document.getElementById('home');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    scrollProgress = clamp((-rect.top) / (rect.height * 0.72), 0, 1);
  }
  function render(time = 0) {
    ctx.clearRect(0,0,width,height);
    const melt = reducedMotion ? 0 : scrollProgress;
    // Reveal the real portrait only around the visitor's pointer/touch.
    if (human.complete && human.naturalWidth && pointer.active && melt < 0.92) {
      revealCtx.clearRect(0,0,width,height);
      coverImage(human, revealCtx, width, height);
      const radius = Math.min(width,height) * 0.31;
      const grad = revealCtx.createRadialGradient(pointer.x,pointer.y, radius*0.12, pointer.x,pointer.y,radius);
      grad.addColorStop(0,'rgba(255,255,255,1)'); grad.addColorStop(0.62,'rgba(255,255,255,.88)'); grad.addColorStop(1,'rgba(255,255,255,0)');
      revealCtx.globalCompositeOperation = 'destination-in'; revealCtx.fillStyle = grad; revealCtx.fillRect(0,0,width,height); revealCtx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - melt * 0.9; ctx.drawImage(revealCanvas,0,0,width,height); ctx.globalAlpha = 1;
    }
    const repelRadius = Math.min(width,height) * 0.22;
    for (const p of particles) {
      let dx=0, dy=0, dist=9999;
      if (pointer.active) { dx=p.ox-pointer.x; dy=p.oy-pointer.y; dist=Math.hypot(dx,dy); }
      let repel = pointer.active ? Math.max(0,1-dist/repelRadius) : 0;
      const force = repel * 22;
      const drift = melt * (height * 0.68) * (0.35 + p.oy/height*0.65);
      const wobble = reducedMotion ? 0 : Math.sin(time*0.0008+p.phase)*0.8;
      const x = p.ox + (dist > 0 ? dx/dist*force : 0) + wobble*0.35;
      const y = p.oy + (dist > 0 ? dy/dist*force : 0) + drift;
      const revealFade = pointer.active ? clamp((dist - repelRadius*0.25)/(repelRadius*0.75),0,1) : 1;
      const alpha = (1-melt) * revealFade;
      if (alpha <= 0.015 || y > height+12) continue;
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = p.size > 1.1 ? 5 : 1.5;
      ctx.beginPath(); ctx.arc(x,y,p.size*(1-melt*0.35),0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    raf = requestAnimationFrame(render);
  }
  Promise.all([new Promise(resolve=>{cyber.onload=resolve; cyber.onerror=resolve;}), new Promise(resolve=>{human.onload=resolve; human.onerror=resolve;})]).then(() => { resize(); updateScroll(); if (!reducedMotion) raf=requestAnimationFrame(render); else render(0); });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  window.addEventListener('resize', resize, { passive:true });
  window.addEventListener('scroll', updateScroll, { passive:true });
})();
