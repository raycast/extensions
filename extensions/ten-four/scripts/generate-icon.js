#!/usr/bin/env node
/*
 * Generates assets/icon.png — a dependency-free 512×512 Raycast icon
 * (rendered at 1024 then downscaled by sips for clean anti-aliasing).
 * A clipboard with snippet lines on an indigo tile.
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const S = 1024;
const buf = Buffer.alloc(S * S * 4); // RGBA, transparent

function px(x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S + x) * 4;
  const sa = a / 255;
  const da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  buf[i] = Math.round((r * sa + buf[i] * da * (1 - sa)) / oa);
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

function roundedRect(x0, y0, w, h, rad, col) {
  const [r, g, b, a = 255] = col;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      let dx = 0,
        dy = 0;
      if (x < x0 + rad) dx = x0 + rad - x;
      else if (x > x0 + w - 1 - rad) dx = x - (x0 + w - 1 - rad);
      if (y < y0 + rad) dy = y0 + rad - y;
      else if (y > y0 + h - 1 - rad) dy = y - (y0 + h - 1 - rad);
      if (dx * dx + dy * dy <= rad * rad) px(x, y, r, g, b, a);
    }
  }
}

// indigo tile
roundedRect(0, 0, S, S, 236, [79, 107, 237, 255]);
// clipboard clip
roundedRect(432, 188, 160, 104, 36, [212, 221, 255, 255]);
// board
roundedRect(296, 248, 432, 560, 56, [255, 255, 255, 255]);
// snippet lines
roundedRect(372, 392, 280, 44, 22, [160, 178, 250, 255]);
roundedRect(372, 500, 280, 44, 22, [160, 178, 250, 255]);
roundedRect(372, 608, 176, 44, 22, [160, 178, 250, 255]);

// encode PNG
function encodePNG() {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // rest 0
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0; // filter none
    buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
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
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const out = path.join(__dirname, "..", "assets", "icon-1024.png");
fs.writeFileSync(out, encodePNG());
const final = path.join(__dirname, "..", "assets", "icon.png");
execSync(`sips -z 512 512 ${JSON.stringify(out)} --out ${JSON.stringify(final)}`, {
  stdio: "ignore",
});
fs.unlinkSync(out);
console.log("wrote", final);
