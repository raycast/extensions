// Generates assets/command-icon.png: a 512×512 "scout target" mark on a rounded
// dark tile. Dependency-free (uses Node's zlib) so the icon is reproducible.
//
// Run with: node scripts/generate-icon.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 512;
const CENTER = SIZE / 2;

// Palette (RGB).
const BG = [26, 27, 32]; // near-black tile
const RING = [88, 166, 255]; // blue rings
const DOT = [255, 255, 255]; // center dot
const CORNER_RADIUS = 96;

/** Linear interpolation between two colors by t in [0,1]. */
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Whether pixel (x,y) is inside the rounded-rectangle tile. */
function insideTile(x, y) {
  const r = CORNER_RADIUS;
  const cx = Math.min(Math.max(x, r), SIZE - r);
  const cy = Math.min(Math.max(y, r), SIZE - r);
  const dx = x < r || x > SIZE - r ? x - cx : 0;
  const dy = y < r || y > SIZE - r ? y - cy : 0;
  return dx * dx + dy * dy <= r * r;
}

/** Color for a pixel: concentric target rings over the tile. */
function pixelColor(x, y) {
  if (!insideTile(x, y)) {
    return null; // transparent outside the rounded tile
  }
  const dist = Math.hypot(x - CENTER, y - CENTER);
  if (dist < 34) {
    return DOT;
  }
  // Three rings at increasing radii.
  for (const [radius, width] of [
    [90, 22],
    [150, 20],
    [210, 18],
  ]) {
    if (Math.abs(dist - radius) < width / 2) {
      // Fade rings slightly toward the edge for depth.
      return mix(RING, BG, Math.min(0.35, dist / SIZE));
    }
  }
  return BG;
}

// Build raw RGBA scanlines with a leading filter byte (0 = none) per row.
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let offset = 0;
for (let y = 0; y < SIZE; y++) {
  raw[offset++] = 0; // filter type
  for (let x = 0; x < SIZE; x++) {
    const color = pixelColor(x, y);
    if (color === null) {
      raw[offset++] = 0;
      raw[offset++] = 0;
      raw[offset++] = 0;
      raw[offset++] = 0; // alpha 0
    } else {
      raw[offset++] = color[0];
      raw[offset++] = color[1];
      raw[offset++] = color[2];
      raw[offset++] = 255;
    }
  }
}

/** CRC32 for PNG chunks. */
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Assemble a PNG chunk (length + type + data + CRC). */
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "command-icon.png");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${png.length} bytes)`);
