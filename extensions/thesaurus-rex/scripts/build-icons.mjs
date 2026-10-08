// Regenerates every icon in assets/: npm run icons
//
// Kept out of assets/ because that directory ships inside the extension bundle.
//
// qlmanage is the only SVG rasteriser macOS ships, and it always composites onto
// opaque white. So each glyph is drawn in black, and the alpha channel is recovered
// from the result: alpha = 255 - grey, RGB = the tint. Anti-aliased edges survive,
// which a white-to-transparent colour key would have turned into halos.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const SIZE = 512;
const LIGHT = [0x2a, 0x62, 0x47]; // on a light window, the brand green
const DARK = [0x7e, 0xd0, 0xa3]; // on a dark window, a tint that stays legible

const GLYPHS = {
  "icon-look-up": '<circle cx="222" cy="222" r="96"/><path d="M292 292 L390 390"/>',
  "icon-synonyms":
    '<path d="M136 200 q60 -72 120 0 t120 0"/><path d="M136 320 q60 -72 120 0 t120 0"/>',
  "icon-antonyms":
    '<path d="M132 196 h248"/><path d="M132 316 h248"/><path d="M330 140 L182 372"/>',
  "icon-define":
    '<path d="M256 168 q-56 -44 -128 -36 v212 q72 -8 128 36 q56 -44 128 -36 v-212 q-72 -8 -128 36 z"/><path d="M256 168 v248"/>',
  "icon-dictionaries":
    '<path d="M256 120 v190"/><path d="M170 226 L256 312 L342 226"/><path d="M136 388 h240"/>',
};

/** The extension tile: filled, because the store shows it as an app icon. */
const TILE =
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#4E9E72"/><stop offset="1" stop-color="#2A6247"/>' +
  '</linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/>';

const svg = (glyph, stroke) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
  `<g fill="none" stroke="${stroke}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Decodes an 8-bit RGB/RGBA PNG into flat RGBA bytes. */
function decode(png) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const parts = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IHDR") {
      width = png.readUInt32BE(offset + 8);
      height = png.readUInt32BE(offset + 12);
      colorType = png[offset + 17];
    }
    if (type === "IDAT") parts.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  let position = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[position++];
    const line = raw.subarray(position, position + stride);
    position += stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const upLeft =
        y > 0 && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const [pa, pb, pc] = [
          Math.abs(p - left),
          Math.abs(p - up),
          Math.abs(p - upLeft),
        ];
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[y * stride + x] = value & 0xff;
    }
  }
  return { width, height, channels, pixels: out };
}

function encode(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const assets = fileURLToPath(new URL("../assets/", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "trex-icons-"));

for (const [name, glyph] of Object.entries(GLYPHS)) {
  const source = join(work, `${name}.svg`);
  writeFileSync(source, svg(glyph, "#000000"));
  execFileSync("qlmanage", ["-t", "-s", String(SIZE), "-o", work, source], {
    stdio: "ignore",
  });
  const { width, height, channels, pixels } = decode(
    readFileSync(join(work, `${name}.svg.png`)),
  );

  for (const [suffix, tint] of [
    ["", LIGHT],
    ["@dark", DARK],
  ]) {
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0, o = 0; i < pixels.length; i += channels, o += 4) {
      const grey = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      rgba[o] = tint[0];
      rgba[o + 1] = tint[1];
      rgba[o + 2] = tint[2];
      rgba[o + 3] = 255 - Math.round(grey);
    }
    writeFileSync(join(assets, `${name}${suffix}.png`), encode(width, height, rgba));
  }
}

// the tile keeps qlmanage's opaque render, which is exactly what it wants
const tile = join(work, "icon.svg");
writeFileSync(
  tile,
  svg(GLYPHS["icon-synonyms"], "#FFFFFF").replace("><g", `>${TILE}<g`),
);
execFileSync("qlmanage", ["-t", "-s", String(SIZE), "-o", work, tile], {
  stdio: "ignore",
});
writeFileSync(join(assets, "icon.png"), readFileSync(join(work, "icon.svg.png")));

console.log(`wrote ${Object.keys(GLYPHS).length * 2 + 1} icons`);
