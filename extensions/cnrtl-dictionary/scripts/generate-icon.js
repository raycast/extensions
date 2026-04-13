/**
 * Generates a minimal valid 512×512 PNG icon for the CNRTL extension.
 * Uses only built-in Node.js modules (zlib, fs, path) — no native deps.
 *
 * Design: deep-blue (#1E3A5F) background with a white stylised "A" letterform
 * rendered as filled rectangles, evoking a dictionary entry initial.
 *
 * Run: node scripts/generate-icon.js
 */

"use strict";

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ─── CRC-32 implementation ────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── PNG chunk builder ────────────────────────────────────────────────────────

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ─── Image rendering ──────────────────────────────────────────────────────────

const W = 512;
const H = 512;

// RGBA pixel buffer
const pixels = Buffer.alloc(W * H * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function fillRect(x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(x + dx, y + dy, r, g, b);
    }
  }
}

function drawCircle(cx, cy, radius, r, g, b, fill = true) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (fill ? dist <= radius : Math.abs(dist - radius) < 2) {
        setPixel(x, y, r, g, b);
      }
    }
  }
}

// ── Background: deep blue rounded square ──
fillRect(0, 0, W, H, 30, 58, 95); // #1E3A5F

// Rounded corners (draw over with transparent by clipping corners)
const R = 80; // corner radius
for (let y = 0; y < R; y++) {
  for (let x = 0; x < R; x++) {
    const dx = R - x - 1;
    const dy = R - y - 1;
    if (dx * dx + dy * dy > R * R) {
      setPixel(x, y, 0, 0, 0, 0);             // top-left
      setPixel(W - 1 - x, y, 0, 0, 0, 0);    // top-right
      setPixel(x, H - 1 - y, 0, 0, 0, 0);    // bottom-left
      setPixel(W - 1 - x, H - 1 - y, 0, 0, 0, 0); // bottom-right
    }
  }
}

// ── Letter "A" as a bold white geometric glyph ──
// We draw it using thick strokes (filled rects + a crossbar).
const OX = 128; // origin x
const OY = 96;  // origin y
const GW = 256; // glyph width
const GH = 320; // glyph height
const TH = 44;  // stroke thickness

// Left diagonal stroke (bottom-left to apex)
for (let i = 0; i <= GH; i++) {
  const frac = i / GH;
  const cx = Math.round(OX + frac * (GW / 2));
  const cy = OY + GH - i;
  fillRect(cx - TH / 2, cy, TH, 2, 255, 255, 255);
}

// Right diagonal stroke (bottom-right to apex)
for (let i = 0; i <= GH; i++) {
  const frac = i / GH;
  const cx = Math.round(OX + GW - frac * (GW / 2));
  const cy = OY + GH - i;
  fillRect(cx - TH / 2, cy, TH, 2, 255, 255, 255);
}

// Crossbar
fillRect(OX + Math.round(GW * 0.22), OY + Math.round(GH * 0.58), Math.round(GW * 0.56), TH, 255, 255, 255);

// Small accent dot / diacritic above the apex (typographical touch)
drawCircle(OX + GW / 2, OY - 30, 18, 100, 180, 255);

// ─── PNG assembly ─────────────────────────────────────────────────────────────

// IHDR
const ihdr = Buffer.allocUnsafe(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Raw image data with filter byte per row
const rawRows = Buffer.allocUnsafe(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  rawRows[y * (1 + W * 4)] = 0; // filter type: None
  pixels.copy(rawRows, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}

const compressedData = zlib.deflateSync(rawRows, { level: 6 });

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const png = Buffer.concat([
  PNG_SIGNATURE,
  makeChunk("IHDR", ihdr),
  makeChunk("IDAT", compressedData),
  makeChunk("IEND", Buffer.alloc(0)),
]);

// ─── Write file ───────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, "..", "assets", "extension-icon.png");
fs.writeFileSync(outPath, png);
console.log(`✓ Icon generated: ${outPath} (${png.length} bytes)`);
