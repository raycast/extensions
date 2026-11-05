// Renders assets/extension-icon.png (512×512) without any image dependency.
// Run with: node scripts/make-icon.mjs

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 512;
const SS = 4;
const W = SIZE * SS;

const pixels = new Float32Array(W * W * 4);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;

function blend(x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const index = (y * W + x) * 4;
  const srcA = clamp01(alpha);
  const dstA = pixels[index + 3];
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  for (let channel = 0; channel < 3; channel++) {
    pixels[index + channel] =
      (color[channel] * srcA + pixels[index + channel] * dstA * (1 - srcA)) / outA;
  }
  pixels[index + 3] = outA;
}

function insideRoundedRect(x, y, left, top, width, height, radius) {
  if (x < left || y < top || x > left + width || y > top + height) return false;
  const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
  const dy = Math.max(top + radius - y, 0, y - (top + height - radius));
  return dx * dx + dy * dy <= radius * radius;
}

// Background: rounded square with a deep indigo gradient.
for (let y = 0; y < W; y++) {
  const t = y / (W - 1);
  const color = [mix(0.28, 0.07, t), mix(0.3, 0.08, t), mix(0.5, 0.17, t)];
  for (let x = 0; x < W; x++) {
    if (insideRoundedRect(x, y, 0, 0, W - 1, W - 1, W * 0.22)) blend(x, y, color, 1);
  }
}

// Globe.
const globeX = 224 * SS;
const globeY = 218 * SS;
const globeR = 124 * SS;
const ring = 9 * SS;
const white = [0.95, 0.96, 1];

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - globeX;
    const dy = y - globeY;
    const distance = Math.hypot(dx, dy);
    if (Math.abs(distance - globeR) <= ring) {
      blend(x, y, white, 1);
      continue;
    }
    // Equator.
    if (Math.abs(dy) <= 7 * SS && Math.abs(dx) <= globeR) {
      blend(x, y, white, 1);
      continue;
    }
    // Meridian: a narrow ellipse from pole to pole.
    const meridian = Math.hypot(dx / (64 * SS), dy / globeR);
    if (Math.abs(meridian - 1) <= 0.06) {
      blend(x, y, white, 1);
      continue;
    }
    // A latitude line, to read as a sphere.
    const latitude = Math.hypot(dx / globeR, dy / (58 * SS));
    if (Math.abs(latitude - 1) <= 0.06) {
      blend(x, y, white, 0.85);
    }
  }
}

// Clock badge.
const badgeX = 380 * SS;
const badgeY = 380 * SS;
const badgeR = 98 * SS;
const badgeRing = 12 * SS;

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - badgeX;
    const dy = y - badgeY;
    const distance = Math.hypot(dx, dy);
    if (distance <= badgeR) {
      const t = clamp01((dx + dy) / (badgeR * 2) + 0.5);
      blend(x, y, [mix(1.0, 0.9, t), mix(0.48, 0.19, t), mix(0.35, 0.13, t)], 1);
    }
    if (Math.abs(distance - (badgeR - badgeRing / 2)) <= badgeRing / 2) {
      blend(x, y, [1, 1, 1], 0.95);
    }
  }
}

function drawHand(angleDegrees, length, thickness) {
  const radians = (angleDegrees * Math.PI) / 180;
  const endX = badgeX + Math.sin(radians) * length;
  const endY = badgeY - Math.cos(radians) * length;
  const half = thickness / 2;

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const dx = endX - badgeX;
      const dy = endY - badgeY;
      const t = clamp01(((x - badgeX) * dx + (y - badgeY) * dy) / (dx * dx + dy * dy));
      const nearestX = badgeX + dx * t;
      const nearestY = badgeY + dy * t;
      if (Math.hypot(x - nearestX, y - nearestY) <= half) blend(x, y, [1, 1, 1], 1);
    }
  }
}

drawHand(300, 44 * SS, 13 * SS); // hour hand, pointing at 10
drawHand(60, 64 * SS, 11 * SS); // minute hand, pointing at 2

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    if (Math.hypot(x - badgeX, y - badgeY) <= 11 * SS) blend(x, y, [1, 1, 1], 1);
  }
}

// Downsample with premultiplied averaging.
const output = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const index = ((y * SS + sy) * W + (x * SS + sx)) * 4;
        const alpha = pixels[index + 3];
        r += pixels[index] * alpha;
        g += pixels[index + 1] * alpha;
        b += pixels[index + 2] * alpha;
        a += alpha;
      }
    }
    const out = (y * SIZE + x) * 4;
    if (a > 0) {
      output[out] = Math.round((r / a) * 255);
      output[out + 1] = Math.round((g / a) * 255);
      output[out + 2] = Math.round((b / a) * 255);
    }
    output[out + 3] = Math.round((a / (SS * SS)) * 255);
  }
}

// PNG encoding.
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // bit depth
header[9] = 6; // RGBA
header[10] = 0;
header[11] = 0;
header[12] = 0;

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  output.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/extension-icon.png");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, png);
console.log(`Wrote ${target} (${png.length} bytes)`);
