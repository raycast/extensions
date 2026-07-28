// Generates assets/icon.png — a 512x512 icon with the Expiration Reminder brand
// color and a simple calendar/clock glyph. No external image libraries needed:
// we build the raw RGBA bitmap and deflate it into a valid PNG.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZE = 512;

// Palette (brand teal on a rounded square, white glyph).
const BG = [15, 118, 110, 255]; // teal-700
const GLYPH = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

function rounded(x, y, r) {
  // rounded-square mask over the full canvas with corner radius r
  const min = 0;
  const max = SIZE - 1;
  const dxs = x < min + r ? min + r - x : x > max - r ? x - (max - r) : 0;
  const dys = y < min + r ? min + r - y : y > max - r ? y - (max - r) : 0;
  return dxs * dxs + dys * dys <= r * r;
}

function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// Draw a stylized calendar: header bar + two rings + a check mark.
function glyph(x, y) {
  const bodyX0 = 140,
    bodyY0 = 150,
    bodyX1 = 372,
    bodyY1 = 380;
  // calendar body outline (stroke)
  const onBorder =
    (inRect(x, y, bodyX0, bodyY0, bodyX1, bodyY1) &&
      !inRect(x, y, bodyX0 + 14, bodyY0 + 14, bodyX1 - 14, bodyY1 - 14)) === true;
  // header band
  const header = inRect(x, y, bodyX0, bodyY0, bodyX1, bodyY0 + 46);
  // rings
  const ring1 = (x - 190) ** 2 + (y - 130) ** 2 <= 16 ** 2 && (x - 190) ** 2 + (y - 130) ** 2 >= 8 ** 2;
  const ring2 = (x - 322) ** 2 + (y - 130) ** 2 <= 16 ** 2 && (x - 322) ** 2 + (y - 130) ** 2 >= 8 ** 2;
  // check mark (two thick strokes)
  const cx = x - 256;
  const cy = y - 300;
  const stroke1 = Math.abs(cx + 40 - -1 * cy) < 16 && cx > -70 && cx < -10 && cy > -10 && cy < 60;
  const stroke2 = Math.abs(cx - 40 - cy) < 16 && cx > -12 && cx < 70 && cy > -60 && cy < 30;
  return onBorder || header || ring1 || ring2 || stroke1 || stroke2;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter type 0 (None) per scanline
  for (let x = 0; x < SIZE; x++) {
    let color;
    if (!rounded(x, y, 96)) {
      color = TRANSPARENT;
    } else if (glyph(x, y)) {
      color = GLYPH;
    } else {
      color = BG;
    }
    raw[p++] = color[0];
    raw[p++] = color[1];
    raw[p++] = color[2];
    raw[p++] = color[3];
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const crcTable = (() => {
  const t = [];
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

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const out = path.join(__dirname, "..", "assets", "icon.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log("Wrote", out, png.length, "bytes");
