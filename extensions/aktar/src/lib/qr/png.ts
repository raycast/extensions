import { deflateSync } from "node:zlib";
import type { QRCode } from "./qrcode";

/**
 * A QR code as a PNG: black on white, `scale` pixels per module, with the
 * four-module white quiet zone scanners need. One bit per pixel, so even a
 * long presigned link stays a small file, and every edge is sharp.
 */
export function qrCodePNG(qr: QRCode, scale = 10, quietZone = 4): Buffer {
  const side = (qr.size + quietZone * 2) * scale;
  const rowBytes = Math.ceil(side / 8);
  // Filter byte (0, none) plus the packed row, for every row.
  const raw = Buffer.alloc((rowBytes + 1) * side);
  for (let y = 0; y < side; y++) {
    const my = Math.floor(y / scale) - quietZone;
    const row = y * (rowBytes + 1);
    for (let x = 0; x < side; x++) {
      const mx = Math.floor(x / scale) - quietZone;
      const dark = my >= 0 && my < qr.size && mx >= 0 && mx < qr.size && qr.modules[my][mx];
      // In 1-bit grayscale, 1 is white.
      if (!dark) raw[row + 1 + (x >>> 3)] |= 0x80 >>> (x & 7);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 1; // bit depth
  header[9] = 0; // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
