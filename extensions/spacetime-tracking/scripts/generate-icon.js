/*
 * Generates assets/icon.png — a 512x512 "spacetime" icon:
 * a vectorial clock sitting inside a black hole (event horizon + glowing
 * accretion disk + photon ring) over a starfield space background.
 *
 * Zero dependencies: builds a PNG with Node's built-in zlib. All shapes are
 * drawn analytically with smoothstep anti-aliasing (i.e. "vectorial").
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 512;
const cx = SIZE / 2;
const cy = SIZE / 2;

// --- PNG helpers -----------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// --- pixel buffer + blending ----------------------------------------------
const px = Buffer.alloc(SIZE * SIZE * 4);

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// alpha-over compositing (a in 0..1)
function over(x, y, r, g, b, a) {
  if (a <= 0 || x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = Math.round(px[i] * (1 - a) + r * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
  px[i + 3] = 255;
}

// additive (glow) compositing, clamped
function add(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = clamp(px[i] + r, 0, 255);
  px[i + 1] = clamp(px[i + 1] + g, 0, 255);
  px[i + 2] = clamp(px[i + 2] + b, 0, 255);
  px[i + 3] = 255;
}

// anti-aliased coverage: 1 inside radius, 0 outside, ~1.4px soft edge
const AA = 1.4;
function disc(d, radius) {
  return clamp((radius - d) / AA + 0.5, 0, 1);
}
function ring(d, rIn, rOut) {
  return Math.min(disc(d, rOut), 1 - disc(d, rIn));
}
function mix(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}
function mixCol(c1, c2, t) {
  return [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
}

// deterministic PRNG so the icon is reproducible
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- scene geometry --------------------------------------------------------
const rEH = 118; // event horizon radius
const diskPeak = 150; // radius of brightest accretion
const photonR = 120; // photon ring radius

const C_WHITEHOT = [255, 246, 232];
const C_GOLD = [255, 205, 110];
const C_ORANGE = [255, 135, 45];
const C_RED = [200, 55, 25];

function diskColor(p) {
  if (p < 0.15) return mixCol(C_WHITEHOT, C_GOLD, p / 0.15);
  if (p < 0.45) return mixCol(C_GOLD, C_ORANGE, (p - 0.15) / 0.3);
  return mixCol(C_ORANGE, C_RED, (p - 0.45) / 0.55);
}

// --- pass 1: space background + nebula + accretion disk + photon ring ------
const nebulae = [
  { x: 150, y: 140, s: 185, c: [80, 40, 130], k: 0.22 },
  { x: 380, y: 395, s: 205, c: [20, 85, 115], k: 0.18 },
];

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // vertical deep-space gradient
    const t = y / SIZE;
    let r = mix(10, 5, t);
    let g = mix(15, 6, t);
    let b = mix(44, 16, t);

    // faint nebula clouds
    for (const n of nebulae) {
      const d2 = (x - n.x) ** 2 + (y - n.y) ** 2;
      const gl = n.k * Math.exp(-d2 / (2 * n.s * n.s));
      r += n.c[0] * gl;
      g += n.c[1] * gl;
      b += n.c[2] * gl;
    }

    const i = (y * SIZE + x) * 4;
    px[i] = clamp(r, 0, 255);
    px[i + 1] = clamp(g, 0, 255);
    px[i + 2] = clamp(b, 0, 255);
    px[i + 3] = 255;

    // accretion disk (glow) + photon ring, additive
    const d = Math.hypot(x - cx, y - cy);
    const dt = d - diskPeak;
    const sig = dt < 0 ? 15 : 48;
    const diskI = Math.exp(-(dt * dt) / (2 * sig * sig));
    if (diskI > 0.003) {
      const p = clamp((d - rEH) / (210 - rEH), 0, 1);
      const col = diskColor(p);
      add(x, y, col[0] * diskI, col[1] * diskI, col[2] * diskI);
    }
    // broad warm halo bleeding into space
    const halo = 0.16 * Math.exp(-((d - diskPeak) ** 2) / (2 * 82 * 82));
    if (halo > 0.002) add(x, y, 255 * halo, 150 * halo, 70 * halo);

    // bright photon ring hugging the event horizon
    const ph = Math.exp(-((d - photonR) ** 2) / (2 * 3.1 * 3.1));
    if (ph > 0.004) add(x, y, 255 * ph, 240 * ph, 210 * ph);
  }
}

// --- pass 2: starfield (behind the black hole) -----------------------------
const rng = mulberry32(20240706);
const STAR_COUNT = 150;
for (let s = 0; s < STAR_COUNT; s++) {
  const sx = rng() * SIZE;
  const sy = rng() * SIZE;
  const size = 0.4 + rng() * 1.2;
  const bright = 0.3 + rng() * 0.7;
  // faint cool/warm tint variation
  const tint = rng();
  const col = tint < 0.2 ? [200, 215, 255] : tint > 0.85 ? [255, 235, 205] : [255, 255, 255];
  const rad = Math.ceil(size * 3);
  for (let oy = -rad; oy <= rad; oy++) {
    for (let ox = -rad; ox <= rad; ox++) {
      const g = bright * Math.exp(-(ox * ox + oy * oy) / (2 * (size * 0.85) ** 2));
      if (g > 0.01) add(Math.round(sx) + ox, Math.round(sy) + oy, col[0] * g, col[1] * g, col[2] * g);
    }
  }
  // a few bright stars get a subtle 4-point sparkle
  if (size > 1.4) {
    for (let l = -rad * 2; l <= rad * 2; l++) {
      const g = 0.5 * bright * Math.exp(-(l * l) / (2 * (size * 1.6) ** 2));
      add(Math.round(sx) + l, Math.round(sy), 255 * g, 255 * g, 255 * g);
      add(Math.round(sx), Math.round(sy) + l, 255 * g, 255 * g, 255 * g);
    }
  }
}

// --- pass 3: event horizon (solid black disk over everything) --------------
{
  const box = rEH + 4;
  for (let y = Math.floor(cy - box); y <= Math.ceil(cy + box); y++) {
    for (let x = Math.floor(cx - box); x <= Math.ceil(cx + box); x++) {
      const d = Math.hypot(x - cx, y - cy);
      const c = disc(d, rEH);
      if (c > 0) over(x, y, 3, 2, 8, c);
    }
  }
}

// --- pass 4: soft cyan glow lifting the clock off the black ----------------
{
  const box = rEH;
  for (let y = Math.floor(cy - box); y <= Math.ceil(cy + box); y++) {
    for (let x = Math.floor(cx - box); x <= Math.ceil(cx + box); x++) {
      const d = Math.hypot(x - cx, y - cy);
      const conf = disc(d, rEH - 2);
      if (conf <= 0) continue;
      const g = 0.32 * Math.exp(-(d * d) / (2 * 66 * 66)) * conf;
      add(x, y, 60 * g, 200 * g, 255 * g);
    }
  }
}

// --- pass 5: the clock (crisp, luminous) -----------------------------------
const C_FACE = [214, 244, 255];
const C_TICK = [234, 250, 255];
const C_HAND = [255, 255, 255];
const C_CENTER = [191, 239, 255];

// filled anti-aliased disc stamp
function stampDisc(X, Y, rad, col, a = 1) {
  const x0 = Math.floor(X - rad - 2);
  const x1 = Math.ceil(X + rad + 2);
  const y0 = Math.floor(Y - rad - 2);
  const y1 = Math.ceil(Y + rad + 2);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - X, y - Y);
      const c = disc(d, rad) * a;
      if (c > 0) over(x, y, col[0], col[1], col[2], c);
    }
  }
}

// round-capped line
function stroke(x1, y1, x2, y2, w, col, a = 1) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(len * 3));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    stampDisc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w, col, a);
  }
}

// clock face ring
{
  const rOut = 92;
  const rIn = 84;
  const box = rOut + 3;
  for (let y = Math.floor(cy - box); y <= Math.ceil(cy + box); y++) {
    for (let x = Math.floor(cx - box); x <= Math.ceil(cx + box); x++) {
      const d = Math.hypot(x - cx, y - cy);
      const c = ring(d, rIn, rOut);
      if (c > 0) over(x, y, C_FACE[0], C_FACE[1], C_FACE[2], c);
      // faint cyan bloom along the ring
      const g = 0.4 * Math.exp(-((d - 88) ** 2) / (2 * 6 * 6));
      if (g > 0.003) add(x, y, 40 * g, 160 * g, 220 * g);
    }
  }
}

// tick marks (12), hour ticks heavier
for (let k = 0; k < 12; k++) {
  const ang = (k * Math.PI) / 6; // 30° steps, 0 = 12 o'clock
  const dirx = Math.sin(ang);
  const diry = -Math.cos(ang);
  const major = k % 3 === 0;
  const inner = major ? 68 : 73;
  const outer = 80;
  const w = major ? 3.4 : 2.1;
  stroke(cx + dirx * inner, cy + diry * inner, cx + dirx * outer, cy + diry * outer, w, C_TICK);
}

// hands — classic 10:10 pose
function handAngle(deg) {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a), -Math.cos(a)];
}
{
  // minute hand -> 2 o'clock (60°), hour hand -> ~10 o'clock (305°)
  const [mx, my] = handAngle(60);
  const [hx, hy] = handAngle(305);
  stroke(cx, cy, cx + mx * 60, cy + my * 60, 4.0, C_HAND);
  stroke(cx, cy, cx + hx * 42, cy + hy * 42, 5.4, C_HAND);
}

// center hub
stampDisc(cx, cy, 6.6, C_HAND);
stampDisc(cx, cy, 3.2, C_CENTER);

// --- encode ----------------------------------------------------------------
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, "..", "assets");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon.png"), png);
console.log("Wrote assets/icon.png (" + png.length + " bytes)");
