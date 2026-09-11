/* eslint-disable no-console */
// Generates the extension icons (512x512 PNG) without external dependencies.
// Usage: node scripts/generate-icon.js
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZE = 512;
const ASSETS_DIR = path.join(__dirname, "..", "assets");

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePNG(filePath, pixels) {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0; // filter: None
    pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

function inRoundedRect(x, y, x0, y0, x1, y1, radius) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + radius ? x0 + radius : x > x1 - radius ? x1 - radius : x;
  const cy = y < y0 + radius ? y0 + radius : y > y1 - radius ? y1 - radius : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function fillPoly(pixels, points, color, set) {
  const ys = points.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) set(x, y, color);
    }
  }
}

function render(bgTop, bgBottom, glyph) {
  const pixels = Buffer.alloc(SIZE * SIZE * 4); // transparent by default
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 255;
  };

  // Rounded-tile gradient background
  for (let y = 0; y < SIZE; y++) {
    const t = y / (SIZE - 1);
    const r = Math.round(bgTop[0] + (bgBottom[0] - bgTop[0]) * t);
    const g = Math.round(bgTop[1] + (bgBottom[1] - bgTop[1]) * t);
    const b = Math.round(bgTop[2] + (bgBottom[2] - bgTop[2]) * t);
    for (let x = 0; x < SIZE; x++) {
      if (inRoundedRect(x, y, 8, 8, SIZE - 9, SIZE - 9, 96)) set(x, y, [r, g, b]);
    }
  }

  // ">" chevron glyph
  fillPoly(
    pixels,
    [
      [130, 168],
      [258, 208],
      [130, 248],
      [130, 226],
      [198, 208],
      [130, 190],
    ],
    glyph,
    set
  );

  // "_" rounded bar
  for (let y = 296; y <= 344; y++) {
    for (let x = 116; x <= 364; x++) {
      if (inRoundedRect(x, y, 116, 296, 364, 344, 24)) set(x, y, glyph);
    }
  }

  return pixels;
}

fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Light theme icon: dark tile with emerald prompt
writePNG(path.join(ASSETS_DIR, "icon.png"), render([15, 23, 42], [30, 41, 59], [52, 211, 153]));

// Dark theme icon: slightly brighter tile with cyan prompt
writePNG(path.join(ASSETS_DIR, "icon@dark.png"), render([30, 41, 59], [56, 72, 103], [34, 211, 238]));

console.log("Icons written to", ASSETS_DIR);