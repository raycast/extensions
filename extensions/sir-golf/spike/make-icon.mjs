// Generates assets/command-icon.png (512x512) with no image deps.
// Golf-green rounded background + a white ball. Throwaway tooling.
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const S = 512;
const buf = Buffer.alloc(S * S * 4);

function set(x, y, r, g, b, a) {
  const i = (y * S + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

const radius = 96; // rounded corner radius
function inRounded(x, y) {
  const cx = Math.min(x, S - 1 - x);
  const cy = Math.min(y, S - 1 - y);
  if (cx >= radius || cy >= radius) return true;
  const dx = radius - cx;
  const dy = radius - cy;
  return dx * dx + dy * dy <= radius * radius;
}

const ballCx = 256,
  ballCy = 256,
  ballR = 150;

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (!inRounded(x, y)) {
      set(x, y, 0, 0, 0, 0); // transparent outside the rounded square
      continue;
    }
    const dx = x - ballCx;
    const dy = y - ballCy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= ballR * ballR) {
      // white golf ball with a few dimples
      let r = 245,
        g = 247,
        b = 245;
      const dimple = ((x % 38) - 19) ** 2 + ((y % 38) - 19) ** 2;
      if (dimple < 18) {
        r = 214;
        g = 222;
        b = 214;
      }
      set(x, y, r, g, b, 255);
    } else {
      // fairway green gradient
      const t = y / S;
      set(x, y, Math.round(22 + 8 * t), Math.round(120 + 30 * t), Math.round(60 + 20 * t), 255);
    }
  }
}

// Build PNG (filter byte 0 per scanline)
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const idat = zlib.deflateSync(raw);

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/command-icon.png", png);
console.log("wrote assets/command-icon.png", png.length, "bytes");
