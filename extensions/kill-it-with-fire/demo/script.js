/**
 * Kill It With Fire — Flame Animation Engine
 *
 * A canvas-based particle system that renders a full-width fire that grows
 * from the bottom of the screen to approximately half-height over ~3 seconds,
 * with smoke billowing upward to the top.
 *
 * Architecture
 * ────────────
 *  Particle      – individual flame or smoke sprite with physics & rendering.
 *  Emitter       – base class that spawns particles at a fixed position.
 *  RisingEmitter – (unused / kept for reference) rises vertically.
 *  FullWidthGrowingEmitter – the main effect: spans full viewport width and
 *                            grows upward to the midpoint of the screen.
 *
 * The animation loop (`loop`) drives emitter updates, particle physics, and
 * draw calls each frame via `requestAnimationFrame`.
 */

// ---------------------------------------------------------------------------
// Canvas setup
// ---------------------------------------------------------------------------

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('flame');

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');

/** Viewport dimensions — kept in sync on resize. */
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;

window.addEventListener('resize', () => {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
});

// ---------------------------------------------------------------------------
// Particle
// ---------------------------------------------------------------------------

/**
 * A single visual element — either a bright flame ellipse or a fading smoke
 * puff. Particles are spawned by emitters and self-destruct when their
 * `life` reaches zero.
 */
class Particle {
    /**
     * @param {number} x  – initial x position (px)
     * @param {number} y  – initial y position (px)
     * @param {{ type: 'flame' | 'smoke' }} opts
     */
    constructor(x, y, opts = { type: 'flame' }) {
        this.x = x;
        this.y = y;
        this.type = opts.type;

        /** Per-particle random seed used for flicker phase offset. */
        this.seed = Math.random() * 10;

        if (this.type === 'flame') {
            // Flame: fast, mostly-upward, short-lived, bright.
            const spread = 0.6;
            const ang = (Math.random() - 0.5) * Math.PI * spread - Math.PI / 2;
            const speed = 200 + Math.random() * 200;            // px / sec
            this.vx = Math.cos(ang) * speed / 60;
            this.vy = Math.sin(ang) * speed / 60;               // negative → up
            this.maxLife = 700 + Math.random() * 900;           // ms
            this.size = 8 + Math.random() * 20;
            this.gravity = 20;                                  // small downward pull
        } else {
            // Smoke: slow, drifty, longer-lived, translucent gray.
            this.vx = (Math.random() - 0.5) * 12 / 60;
            this.vy = -(8 + Math.random() * 30) / 60;           // slow rise
            this.maxLife = 1000 + Math.random() * 1600;         // ms (~1–2.6 s)
            this.size = 14 + Math.random() * 40;
            this.gravity = -6;                                  // upward buoyancy
        }

        this.life = this.maxLife;
        this.created = performance.now();
    }

    /**
     * Advance physics for one frame.
     * @param {DOMHighResTimeStamp} now – current timestamp (ms)
     * @param {number} dt               – elapsed time since last frame (ms)
     */
    update(now, dt) {
        const dtSec = dt / 1000;

        // Sinusoidal horizontal flicker gives a candle-like wobble.
        const flicker = Math.sin((now - this.created) / 80 + this.seed) * 0.25;

        // Tiny random gusts add turbulence.
        this.vx += (Math.random() - 0.5) * 0.6 * dtSec;
        this.vx *= Math.pow(0.985, dtSec * 60);                // drag
        this.vy += (this.gravity / 60) * dtSec * 60;           // gravity / buoyancy

        this.x += (this.vx + flicker) * dtSec * 60;
        this.y += this.vy * dtSec * 60;
        this.life -= dt;
        this.size *= 1 - 0.002 * (dt / 16);                    // gradual shrink
    }

    /**
     * Render the particle onto the given context.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        /** Progress from 0 (fresh) → 1 (dead). */
        const t = 1 - Math.max(0, this.life) / this.maxLife;

        if (this.type === 'flame') {
            const alpha = Math.max(0, (1 - t) * 0.95);
            const r = 240;
            const g = Math.floor(120 * (1 - t));
            const b = Math.floor(30 * (1 - t));
            const spread = Math.max(1, this.size * (1 - t * 0.6));
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, spread, spread * 1.4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const alpha = Math.max(0, (1 - t) * 0.45);
            const gray = 40 + Math.floor(80 * t);
            ctx.fillStyle = `rgba(${gray},${gray},${gray},${alpha})`;
            ctx.beginPath();
            ctx.ellipse(
                this.x, this.y,
                this.size * (0.6 + t * 0.6),
                this.size * (0.3 + t * 1.2),
                0, 0, Math.PI * 2,
            );
            ctx.fill();
        }
    }
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

/** @type {Particle[]} Active particles. */
const particles = [];

/** @type {Emitter[]} Active emitters. */
const emitters = [];

/** Timestamp of the previous animation frame (0 when idle). */
let lastT = 0;

/** Whether the animation loop is currently running. */
let running = false;

// ---------------------------------------------------------------------------
// Emitter (base)
// ---------------------------------------------------------------------------

/**
 * Spawns particles at a fixed (x, y) position for a given duration.
 * Subclasses override `update()` to customise spawn patterns.
 */
class Emitter {
    /**
     * @param {number} x        – horizontal position (px)
     * @param {number} y        – vertical position (px)
     * @param {number} duration – how long to emit (ms)
     * @param {number} pps      – particles per second
     */
    constructor(x, y, duration = 2000, pps = 300) {
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.pps = pps;
        this.start = performance.now();
        this.accum = 0;
        this.finished = false;
        this.follow = false;
    }

    /**
     * Emit particles for one frame.
     * @param {DOMHighResTimeStamp} now
     * @param {number} dt – frame delta (ms)
     */
    update(now, dt) {
        const elapsed = now - this.start;
        if (!this.follow && elapsed >= this.duration) {
            this.finished = true;
        }

        const spawnRate = this.pps * (this.finished ? 0 : 1);
        this.accum += spawnRate * (dt / 1000);

        while (this.accum >= 1) {
            this.accum -= 1;
            if (Math.random() < 0.15) {
                particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * 30,
                    this.y + (Math.random() - 0.5) * 10,
                    { type: 'smoke' },
                ));
            }
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 30,
                this.y + (Math.random() - 0.5) * 20,
                { type: 'flame' },
            ));
        }
    }
}

// ---------------------------------------------------------------------------
// RisingEmitter (kept for reference / alternate FX)
// ---------------------------------------------------------------------------

/**
 * An emitter anchored at a horizontal position that rises from the bottom of
 * the viewport to the top, widening its horizontal spread as it climbs.
 */
class RisingEmitter extends Emitter {
    /**
     * @param {number} x        – horizontal anchor (px)
     * @param {number} duration – total animation time (ms)
     * @param {number} basePps  – starting particles-per-second
     */
    constructor(x, duration = 3000, basePps = 300) {
        super(x, innerHeight + 60, duration, basePps);
        this.x0 = x;
        this.startY = innerHeight + 60;
        this.endY = -60;
        this.basePps = basePps;
    }

    /** @override */
    update(now, dt) {
        const elapsed = now - this.start;
        const progress = Math.min(1, Math.max(0, elapsed / this.duration));

        this.y = this.startY + (this.endY - this.startY) * progress;

        const pps = this.basePps * (0.6 + 3 * progress);
        this.accum += pps * (dt / 1000);
        const horizSpread = 30 + progress * (W * 1.2);

        while (this.accum >= 1) {
            this.accum -= 1;
            const px = this.x0 + (Math.random() - 0.5) * horizSpread;
            const py = this.y + (Math.random() - 0.5) * 40;
            if (Math.random() < 0.18) {
                particles.push(new Particle(px, py, { type: 'smoke' }));
            }
            particles.push(new Particle(px, py, { type: 'flame' }));
        }

        if (progress >= 1) this.finished = true;
    }
}

// ---------------------------------------------------------------------------
// FullWidthGrowingEmitter (primary effect)
// ---------------------------------------------------------------------------

/**
 * The main fire animation. Spawns flames across the full viewport width,
 * growing upward from the bottom to approximately half the screen height
 * over the configured duration (~3 s). Smoke particles are spawned above
 * the flame front and float upward to the top of the viewport.
 */
class FullWidthGrowingEmitter extends Emitter {
    /**
     * @param {number} duration – total grow time (ms, default 3000)
     * @param {number} basePps  – base particles-per-second (scales up with progress)
     */
    constructor(duration = 3000, basePps = 300) {
        super(W / 2, H + 60, duration, basePps);
        this.basePps = basePps;
        this.startY = H + 60;
        this.targetTop = H * 0.5;   // flame front stops at midscreen
        /** @private */ this._smokeAcc = 0;
    }

    /** @override */
    update(now, dt) {
        const elapsed = now - this.start;
        const progress = Math.min(1, Math.max(0, elapsed / this.duration));

        // Vertical spawn region grows from the bottom toward the midpoint.
        const maxRise = H - this.targetTop;
        const currentRise = maxRise * progress;
        const minY = H - currentRise - 10;   // top of spawn band
        const maxY = H + 20;                  // bottom of spawn band

        // Particle emission rate ramps up as the fire grows.
        const pps = this.basePps * (0.8 + 1.5 * progress);
        this.accum += pps * (dt / 1000);

        // Spawn flame (and occasional smoke) across the full width.
        while (this.accum >= 1) {
            this.accum -= 1;
            const px = Math.random() * W;
            const py = minY + Math.random() * (maxY - minY);
            if (Math.random() < 0.18) {
                particles.push(new Particle(
                    px + (Math.random() - 0.5) * 20,
                    py + (Math.random() - 0.5) * 10,
                    { type: 'smoke' },
                ));
            }
            particles.push(new Particle(
                px + (Math.random() - 0.5) * 30,
                py + (Math.random() - 0.5) * 20,
                { type: 'flame' },
            ));
        }

        // Dedicated smoke that rises from the flame front toward the top.
        const smokePerSec = 40 * (0.5 + progress);
        this._smokeAcc += smokePerSec * (dt / 1000);
        while (this._smokeAcc >= 1) {
            this._smokeAcc -= 1;
            const sx = Math.random() * W;
            const sy = minY - Math.random() * 40;
            const s = new Particle(sx, sy, { type: 'smoke' });
            s.maxLife = 2000 + Math.random() * 2200;           // longer life → reaches top
            s.life = s.maxLife;
            s.vy = -(20 + Math.random() * 60) / 60;            // faster upward
            particles.push(s);
        }

        if (progress >= 1) this.finished = true;
    }
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

/**
 * Create a basic fixed-position emitter.
 * @returns {Emitter}
 */
function spawnEmitter(x, y, duration = 2000, pps = 220) {
    const e = new Emitter(x, y, duration, pps);
    emitters.push(e);
    running = true;
    if (!lastT) requestAnimationFrame(loop);
    return e;
}

/**
 * Create a rising emitter (alternate effect).
 * @returns {RisingEmitter}
 */
function spawnRising(x = W / 2, duration = 3000, basePps = 260) {
    const e = new RisingEmitter(x, duration, basePps);
    emitters.push(e);
    running = true;
    if (!lastT) requestAnimationFrame(loop);
    return e;
}

/**
 * Create the full-width growing flame — the main "Kill It With Fire" effect.
 * @param {number} duration – animation length in ms (default 3000)
 * @param {number} basePps  – base particles-per-second (default 420)
 * @returns {FullWidthGrowingEmitter}
 */
function spawnFullWidthGrow(duration = 3000, basePps = 420) {
    const e = new FullWidthGrowingEmitter(duration, basePps);
    emitters.push(e);
    running = true;
    if (!lastT) requestAnimationFrame(loop);
    return e;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Immediately stop all particles, emitters, and clear the canvas. */
function clearAll() {
    particles.length = 0;
    emitters.length = 0;
    running = false;
    lastT = 0;
    ctx.clearRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

/**
 * Core render loop driven by `requestAnimationFrame`. Updates emitters and
 * particles, then draws everything with additive blending for the glow effect.
 * Automatically stops when there is nothing left to render.
 *
 * @param {DOMHighResTimeStamp} t – timestamp provided by rAF
 */
function loop(t) {
    if (!lastT) lastT = t || performance.now();
    const now = t || performance.now();
    const dt = Math.min(40, now - lastT);   // clamp to avoid big jumps
    lastT = now;

    // --- Emitters ---
    for (let i = emitters.length - 1; i >= 0; i--) {
        const e = emitters[i];
        e.update(now, dt);
        if (e.finished) emitters.splice(i, 1);
    }

    // --- Particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(now, dt);
        if (p.life <= 0 || p.size < 0.5) particles.splice(i, 1);
    }

    // --- Draw ---
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';   // additive glow
    ctx.save();
    for (const p of particles) p.draw(ctx);
    ctx.restore();

    // Keep looping while there is activity; otherwise idle.
    if (emitters.length > 0 || particles.length > 0) {
        requestAnimationFrame(loop);
    } else {
        running = false;
        lastT = 0;
    }
}

// ---------------------------------------------------------------------------
// UI event bindings
// ---------------------------------------------------------------------------

/** "Ignite!" button — triggers the full-width growing flame. */
document.getElementById('burn').addEventListener('click', () => {
    spawnFullWidthGrow(3000, 420);
});

/** "Stop" button — kills everything immediately. */
document.getElementById('stop').addEventListener('click', () => {
    clearAll();
});

/** Clicking anywhere on the canvas also triggers the effect. */
canvas.addEventListener('pointerdown', () => {
    spawnFullWidthGrow(3000, 420);
});
