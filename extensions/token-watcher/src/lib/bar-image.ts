import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { deflateSync } from "zlib";
import { environment } from "@raycast/api";

// Warm coral/orange fill matching the screenshot aesthetic
const FILL_COLOR = [207, 139, 100, 255];
const BG_COLOR = [220, 220, 220, 255];
const TRANSPARENT = [0, 0, 0, 0];

// Image dimensions (2x for Retina)
const WIDTH = 360;
const HEIGHT = 16;
const RADIUS = 8; // corner radius in px

function getBarDir(): string {
  const dir = join(environment.supportPath, "bars");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function isInsideRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): boolean {
  // Check the four corners
  if (x < r && y < r) {
    return (r - x) * (r - x) + (r - y) * (r - y) <= r * r;
  }
  if (x >= w - r && y < r) {
    return (x - (w - r - 1)) * (x - (w - r - 1)) + (r - y) * (r - y) <= r * r;
  }
  if (x < r && y >= h - r) {
    return (r - x) * (r - x) + (y - (h - r - 1)) * (y - (h - r - 1)) <= r * r;
  }
  if (x >= w - r && y >= h - r) {
    return (
      (x - (w - r - 1)) * (x - (w - r - 1)) +
        (y - (h - r - 1)) * (y - (h - r - 1)) <=
      r * r
    );
  }
  return true;
}

function createPNG(width: number, height: number, raw: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBuffer, data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(combined) >>> 0);
    return Buffer.concat([length, combined, c]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // pHYs chunk: 144 DPI (2x Retina) = 5669 pixels/meter
  const phys = Buffer.alloc(9);
  phys.writeUInt32BE(5669, 0);
  phys.writeUInt32BE(5669, 4);
  phys[8] = 1; // unit = meter

  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("pHYs", phys),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

export function getBarImage(usedPct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(usedPct)));
  const barDir = getBarDir();
  const filePath = join(barDir, `bar-${clamped}.png`);

  if (existsSync(filePath)) return filePath;

  const filled = Math.round((clamped / 100) * WIDTH);

  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 4));
  let offset = 0;

  for (let y = 0; y < HEIGHT; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < WIDTH; x++) {
      const inside = isInsideRoundedRect(x, y, WIDTH, HEIGHT, RADIUS);
      let color: number[];
      if (!inside) {
        color = TRANSPARENT;
      } else if (x < filled) {
        color = FILL_COLOR;
      } else {
        color = BG_COLOR;
      }
      raw[offset++] = color[0];
      raw[offset++] = color[1];
      raw[offset++] = color[2];
      raw[offset++] = color[3];
    }
  }

  const png = createPNG(WIDTH, HEIGHT, raw);
  writeFileSync(filePath, png);
  return filePath;
}
