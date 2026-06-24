// Generates assets/icon.png — a 512x512 rounded-square yellow tile with a white bolt glyph.
// Run with: node scripts/make-icon.js
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const SIZE = 512;
const RADIUS = 96;

// RGBA pixel buffer
const buf = Buffer.alloc(SIZE * SIZE * 4);
const BG = [255, 196, 0, 255]; // yellow
const FG = [255, 255, 255, 255]; // white bolt
const TRANSPARENT = [0, 0, 0, 0];

function setPx(x, y, c) {
  const i = (y * SIZE + x) * 4;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
  buf[i + 3] = c[3];
}

// Bolt polygon (rough lightning glyph, normalized to 512x512)
const bolt = [
  [288, 48],
  [144, 280],
  [232, 280],
  [192, 464],
  [368, 232],
  [272, 232],
];
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1];
    const xj = poly[j][0],
      yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Rounded square mask + fill
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // Rounded corners
    const dx = x < RADIUS ? RADIUS - x : x >= SIZE - RADIUS ? x - (SIZE - RADIUS - 1) : 0;
    const dy = y < RADIUS ? RADIUS - y : y >= SIZE - RADIUS ? y - (SIZE - RADIUS - 1) : 0;
    if (dx * dx + dy * dy > RADIUS * RADIUS) {
      setPx(x, y, TRANSPARENT);
      continue;
    }
    setPx(x, y, pointInPoly(x, y, bolt) ? FG : BG);
  }
}

// Encode as PNG (raw 8-bit RGBA, IDAT zlib-compressed scanlines with filter=0)
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  buf.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const idatData = zlib.deflateSync(raw, { level: 9 });

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
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
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = (crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
}

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idatData), chunk("IEND", Buffer.alloc(0))]);

const out = path.join(__dirname, "..", "assets", "icon.png");
fs.writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
