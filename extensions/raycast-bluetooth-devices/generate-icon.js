#!/usr/bin/env node
// Generates assets/command-icon.png — a 512×512 Bluetooth icon.
// Pure Node.js, no external packages required.
"use strict";

const { deflateSync } = require("zlib");
const { writeFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

const SIZE = 512;

// RGBA pixel buffer (all transparent to start)
const px = new Uint8Array(SIZE * SIZE * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  // Blend over existing content (simple alpha composite)
  const aa = a / 255;
  px[i]     = Math.round(px[i]     * (1 - aa) + r * aa);
  px[i + 1] = Math.round(px[i + 1] * (1 - aa) + g * aa);
  px[i + 2] = Math.round(px[i + 2] * (1 - aa) + b * aa);
  px[i + 3] = Math.min(255, px[i + 3] + a);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function fillCircle(cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) setPixel(cx + dx, cy + dy, r, g, b);
    }
  }
}

function drawLine(x1, y1, x2, y2, r, g, b, thick = 28) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const steps = Math.ceil(len * 2);
  const nx = -dy / len; // normal
  const ny = dx / len;
  const half = thick / 2;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px_ = x1 + dx * t;
    const py_ = y1 + dy * t;
    for (let j = -half; j <= half; j++) {
      // Anti-aliased edge: fade last 1.5px
      const dist = Math.abs(j);
      const alpha = dist > half - 1.5 ? Math.round(255 * (half - dist) / 1.5) : 255;
      if (alpha <= 0) continue;
      setPixel(Math.round(px_ + nx * j), Math.round(py_ + ny * j), r, g, b, alpha);
    }
  }
}

// ── Compose the icon ──────────────────────────────────────────────────────────

// 1. Blue filled circle (Bluetooth brand colour)
fillCircle(256, 256, 256, 0, 112, 243);

// 2. White Bluetooth symbol (centred at 256,256)
// Coordinates of the five key points
const TOP = [256, 96];
const URP = [346, 171]; // upper-right point
const MID = [256, 256];
const LRP = [346, 341]; // lower-right point
const BOT = [256, 416];

const T = 30; // line thickness
const W = [255, 255, 255]; // white

drawLine(...TOP, ...BOT, ...W, T);   // vertical spine (drawn first, overlaid by diagonals)
drawLine(...TOP, ...URP, ...W, T);   // top → upper-right
drawLine(...URP, ...MID, ...W, T);   // upper-right → centre
drawLine(...MID, ...LRP, ...W, T);   // centre → lower-right
drawLine(...LRP, ...BOT, ...W, T);   // lower-right → bottom

// ── PNG encoder ───────────────────────────────────────────────────────────────

function crc32(buf) {
  // Build lookup table once
  if (!crc32._t) {
    crc32._t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32._t[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crc32._t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([lenBuf, body, crcBuf]);
}

function encodePNG(width, height, rgba) {
  // IHDR: width, height, bit-depth=8, colour-type=6 (RGBA)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // compression, filter, interlace all 0

  // Raw scanlines: filter-byte (0=None) + RGBA pixels
  const rows = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + width * 4);
    rows[rowOff] = 0; // filter: None
    rgba.copy(rows, rowOff + 1, y * width * 4, (y + 1) * width * 4);
  }

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Write file ────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, "assets");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const pngPath = path.join(outDir, "command-icon.png");
writeFileSync(pngPath, encodePNG(SIZE, SIZE, Buffer.from(px.buffer)));
console.log(`Icon written → ${pngPath}`);
