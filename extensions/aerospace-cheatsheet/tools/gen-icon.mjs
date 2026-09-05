// Generates assets/icon.png — the extension's Raycast icon.
//
// Rasterizes and encodes the PNG here rather than shelling out to a converter. Every
// SVG rasterizer on a stock macOS box (qlmanage, sips, Preview) composites onto an
// opaque white background, which shipped an icon whose rounded corners were white
// instead of transparent — white triangles against Raycast's dark UI. Doing it in
// Node means correct alpha, and means anyone cloning the repo can regenerate the icon
// without installing a rasterizer.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const SIZE = 512;
const CORNER = 112; // outer radius, matching macOS app-icon proportions
const PAD = 78;
const R = 34; // inner window radius
const GAP = 20;
const SS = 4; // supersampling per axis — 16 samples/pixel

const GRADIENT_TOP = [0x2b, 0x8c, 0xff];
const GRADIENT_BOTTOM = [0x0a, 0x5f, 0xd0];

/** Signed distance to a rounded rectangle. Negative inside. */
function roundedRectSD(x, y, left, top, w, h, r) {
  const dx = Math.abs(x - (left + w / 2)) - (w / 2 - r);
  const dy = Math.abs(y - (top + h / 2)) - (h / 2 - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

/** Fraction of a pixel covered by a shape, via supersampling. */
function coverage(px, py, sd) {
  let hits = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      if (sd(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS) < 0) hits++;
    }
  }
  return hits / (SS * SS);
}

const inner = SIZE - PAD * 2;
const leftW = inner * 0.42;
const rightX = PAD + leftW + GAP;
const rightW = inner - leftW - GAP;
const halfH = (inner - GAP) / 2;

const WINDOWS = [
  { sd: (x, y) => roundedRectSD(x, y, PAD, PAD, leftW, inner, R), alpha: 0.95 },
  { sd: (x, y) => roundedRectSD(x, y, rightX, PAD, rightW, halfH, R), alpha: 0.62 },
  { sd: (x, y) => roundedRectSD(x, y, rightX, PAD + halfH + GAP, rightW, halfH, R), alpha: 0.62 },
];

const pixels = Buffer.alloc(SIZE * SIZE * 4);

for (let y = 0; y < SIZE; y++) {
  const t = y / (SIZE - 1);
  const base = GRADIENT_TOP.map((c, i) => c + (GRADIENT_BOTTOM[i] - c) * t);

  for (let x = 0; x < SIZE; x++) {
    let [r, g, b] = base;
    for (const win of WINDOWS) {
      const c = coverage(x, y, win.sd) * win.alpha;
      if (c > 0) {
        r += (255 - r) * c;
        g += (255 - g) * c;
        b += (255 - b) * c;
      }
    }

    const offset = (y * SIZE + x) * 4;
    pixels[offset] = Math.round(r);
    pixels[offset + 1] = Math.round(g);
    pixels[offset + 2] = Math.round(b);
    // Alpha comes from the tile silhouette alone, so outside the rounded corners the
    // pixel is genuinely transparent rather than white.
    pixels[offset + 3] = Math.round(coverage(x, y, (sx, sy) => roundedRectSD(sx, sy, 0, 0, SIZE, SIZE, CORNER)) * 255);
  }
}

// ---------------------------------------------------------------- PNG encoding
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
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

// Each scanline is prefixed with filter type 0 (None).
const scanlines = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  scanlines[rowStart] = 0;
  pixels.copy(scanlines, rowStart + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
ihdr[10] = 0; // deflate
ihdr[11] = 0; // adaptive filtering
ihdr[12] = 0; // no interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(scanlines, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(join(HERE, "..", "assets", "icon.png"), png);
console.log(`wrote assets/icon.png - ${SIZE}x${SIZE} RGBA, ${(png.length / 1024).toFixed(1)} KB`);
