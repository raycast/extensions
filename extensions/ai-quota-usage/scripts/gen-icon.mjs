// Generates assets/icon.png (512x512) — a "quota ring" motif that echoes the
// progress rings in the extension UI. Supersampled 4x for smooth edges.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const SIZE = 512;
const SS = 4; // supersampling factor
const W = SIZE * SS;
const H = SIZE * SS;

// palette
const BG = [26, 22, 52]; // deep indigo
const RING_BG = [58, 50, 102]; // faint track
const RING_FG = [124, 107, 240]; // indigo fill
const RING_TIP = [150, 220, 170]; // green-ish "healthy" tip

const cx = W / 2;
const cy = H / 2;
const outerR = W * 0.34;
const innerR = W * 0.22;
const cornerR = W * 0.22; // rounded-square background
const fraction = 0.72; // how much of the ring is filled

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Render RGB at a supersampled pixel (no alpha — full-bleed background).
function shade(x, y) {
  // rounded-square background mask (everything is opaque; corners get BG too, kept simple)
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);

  if (dist < innerR - 2 || dist > outerR + 2) return BG;
  if (dist < innerR || dist > outerR) {
    // soft edge band -> blend toward BG
    const edge = dist < innerR ? innerR - dist : dist - outerR;
    const t = Math.min(1, edge / 2);
    return mix(RING_FG, BG, t); // approximate; refined below by track color where needed
  }

  // within the ring band — decide filled vs track by angle
  let p = (Math.atan2(dy, dx) + Math.PI / 2) / (2 * Math.PI);
  if (p < 0) p += 1; // 0=top, 0.25=right, 0.5=bottom, 0.75=left (clockwise)

  if (p <= fraction) {
    // gradient along the fill; tip goes green
    const along = p / fraction;
    return along > 0.85 ? mix(RING_FG, RING_TIP, (along - 0.85) / 0.15) : RING_FG;
  }
  return RING_BG;
}

// supersample -> downsample by SS x SS box average
const out = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let p = 0;
for (let oy = 0; oy < SIZE; oy++) {
  out[p++] = 0; // PNG filter byte
  for (let ox = 0; ox < SIZE; ox++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = shade(ox * SS + sx + 0.5, oy * SS + sy + 0.5);
        r += c[0];
        g += c[1];
        b += c[2];
      }
    }
    const n = SS * SS;
    out[p++] = Math.round(r / n);
    out[p++] = Math.round(g / n);
    out[p++] = Math.round(b / n);
    out[p++] = 255;
  }
}

// PNG encoding
const crcTable = (() => {
  const t = new Uint32Array(256);
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
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6; // RGBA
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(out)), chunk("IEND", Buffer.alloc(0))]);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/icon.png", png);
console.log(`wrote assets/icon.png (${png.length} bytes, ${SIZE}x${SIZE}, ${SS}x supersampled)`);
