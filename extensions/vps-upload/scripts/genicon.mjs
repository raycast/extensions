// Generates assets/icon.png (512x512) — a white cloud with an up-arrow knocked
// out of it, on a teal->green vertical gradient. Full-bleed, anti-aliased via 4x
// supersampling. Dependency-free PNG encoder (Node zlib).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 512;
const SS = 4; // supersampling factor
const TILE_R = 112; // corner radius of the icon tile (~22%, macOS-squircle-ish)

// Colours
const TOP = [45, 212, 191]; // teal-400  #2DD4BF
const BOT = [34, 197, 94]; // green-500 #22C55E
const WHITE = [255, 255, 255];

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// All geometry in 512-space. Flat-bottomed cloud: rounded-rect base + top puffs.
function inCloud(x, y) {
  return (
    inRoundRect(x, y, 176, 286, 344, 338, 24) ||
    inCircle(x, y, 198, 284, 48) ||
    inCircle(x, y, 256, 250, 68) ||
    inCircle(x, y, 324, 284, 54)
  );
}
function inArrow(x, y) {
  // stem
  if (inRect(x, y, 238, 262, 274, 326)) return true;
  // head: apex (256,192) widening to base at y=268, half-width 62
  if (y >= 192 && y <= 268) {
    const half = ((y - 192) / (268 - 192)) * 62;
    if (Math.abs(x - 256) <= half) return true;
  }
  return false;
}

function colorAt(x, y) {
  // full-bleed gradient
  const t = y / SIZE;
  const g = [
    Math.round(TOP[0] + (BOT[0] - TOP[0]) * t),
    Math.round(TOP[1] + (BOT[1] - TOP[1]) * t),
    Math.round(TOP[2] + (BOT[2] - TOP[2]) * t),
  ];
  if (inCloud(x, y) && !inArrow(x, y)) return WHITE;
  return g;
}

// Supersample into the 512 buffer. The rounded-rect tile mask drives alpha so
// the corners are transparent (matching other rounded Raycast icons).
const data = Buffer.alloc(SIZE * SIZE * 4);
for (let py = 0; py < SIZE; py++) {
  for (let px = 0; px < SIZE; px++) {
    let r = 0,
      gg = 0,
      b = 0,
      inside = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS;
        const y = py + (sy + 0.5) / SS;
        if (!inRoundRect(x, y, 0, 0, SIZE, SIZE, TILE_R)) continue;
        inside++;
        const c = colorAt(x, y);
        r += c[0];
        gg += c[1];
        b += c[2];
      }
    }
    const n = SS * SS;
    const i = (py * SIZE + px) * 4;
    if (inside === 0) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    } else {
      data[i] = Math.round(r / inside);
      data[i + 1] = Math.round(gg / inside);
      data[i + 2] = Math.round(b / inside);
      data[i + 3] = Math.round((255 * inside) / n);
    }
  }
}

// --- PNG encode ---
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  data.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])), 0);
  return Buffer.concat([len, typeBuf, body, crc]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
writeFileSync(new URL("../assets/icon.png", import.meta.url), png);
console.log("wrote assets/icon.png", png.length, "bytes");
