import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Generates assets/<agent>.png: the neutral ring mark used as a fallback icon when an agent's
 * desktop app is not installed (when it is, the list shows the app's real icon instead).
 *
 * The mark is deliberately generic — a ring in a colour associated with the agent — so no
 * third-party logo is vendored into the repository. Run with `node scripts/make-agent-icons.mjs`.
 */

const SIZE = 128;
const OUTER = 0.42; // of SIZE
const INNER = 0.155;

const COLORS = {
  claude: "#d97757",
  codex: "#10a37f",
  cursor: "#5b6472",
  gemini: "#4285f4",
  qwen: "#7c3aed",
  opencode: "#e0a020",
  crush: "#ff6ac1",
  copilot: "#7d8590",
  amp: "#a855f7",
  goose: "#0ea5e9",
  droid: "#f97316",
};

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Anti-aliased coverage of the ring at a pixel, by 3x3 supersampling. */
function coverage(x, y) {
  const c = SIZE / 2;
  const outer = SIZE * OUTER;
  const inner = SIZE * INNER;
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const px = x + (sx + 0.5) / 3 - c;
      const py = y + (sy + 0.5) / 3 - c;
      const d = Math.hypot(px, py);
      if (d <= outer && d >= inner) hits++;
    }
  }
  return hits / 9;
}

function png(color) {
  const [r, g, b] = rgb(color);
  // Raw scanlines: one filter byte (0 = none) per row, then RGBA pixels.
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  let o = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[o++] = 0;
    for (let x = 0; x < SIZE; x++) {
      const a = Math.round(coverage(x, y) * 255);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const only = process.argv.slice(2);
for (const [name, color] of Object.entries(COLORS)) {
  if (only.length && !only.includes(name)) continue;
  const file = join(assets, `${name}.png`);
  writeFileSync(file, png(color));
  console.log(`wrote ${file}`);
}
