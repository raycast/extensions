/**
 * Writes store-sized (2000×1250) placeholder PNGs into metadata/.
 * Replace with Raycast Advanced Preferences → Window Capture → Save to Metadata before store submission.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

/** Vertical gradient resembling Raycast root search / detail dark theme. */
function createPlaceholderPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);

  const top = { r: 0x2c, g: 0x2c, b: 0x36 };
  const bottom = { r: 0x14, g: 0x14, b: 0x18 };
  const barH = Math.min(100, Math.floor(height * 0.07));

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    const t = y / (height - 1 || 1);
    const r = Math.round(top.r + (bottom.r - top.r) * t);
    const g = Math.round(top.g + (bottom.g - top.g) * t);
    const b = Math.round(top.b + (bottom.b - top.b) * t);
    const inBar = y < barH;
    for (let x = 0; x < width; x++) {
      const o = rowStart + 1 + x * 3;
      if (inBar) {
        const shade = 0x22;
        raw[o] = shade;
        raw[o + 1] = shade;
        raw[o + 2] = Math.min(255, shade + 4);
      } else {
        raw[o] = r;
        raw[o + 1] = g;
        raw[o + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = chunk("IHDR", ihdrData);
  const idat = chunk("IDAT", compressed);
  const iend = chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

const root = path.join(__dirname, "..");
const meta = path.join(root, "metadata");
fs.mkdirSync(meta, { recursive: true });

const shots = ["unescape-string.png", "escape-string.png", "string-unescape.png"];
for (const name of shots) {
  fs.writeFileSync(path.join(meta, name), createPlaceholderPng(2000, 1250));
}

console.log(`Wrote ${shots.map((n) => "metadata/" + n).join(", ")}`);
