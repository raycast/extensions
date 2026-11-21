import { containSquare } from "../image";
import type { OutputFormat } from "../types";
import { encodePng } from "./png";

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

/** Pack PNG images into a single .ico container (PNG entries, supported since Windows Vista). */
export function packIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const headerSize = 6 + images.length * 16;
  const out = Buffer.alloc(headerSize + images.reduce((n, i) => n + i.png.length, 0));
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type: icon
  out.writeUInt16LE(images.length, 4);
  let offset = headerSize;
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    out.writeUInt8(size >= 256 ? 0 : size, e); // 0 means 256
    out.writeUInt8(size >= 256 ? 0 : size, e + 1);
    out.writeUInt8(0, e + 2); // palette size
    out.writeUInt8(0, e + 3); // reserved
    out.writeUInt16LE(1, e + 4); // colour planes
    out.writeUInt16LE(32, e + 6); // bits per pixel
    out.writeUInt32LE(png.length, e + 8);
    out.writeUInt32LE(offset, e + 12);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

export const toIco: OutputFormat = {
  id: "ico",
  label: "ICO",
  extension: "ico",
  options: [],
  async write(source) {
    const images = [];
    for (const size of ICO_SIZES) {
      // Vector input is re-rendered at each size; raster input is resampled.
      const img = containSquare(await source.raster(size), size);
      images.push({ size, png: encodePng(img) });
    }
    return packIco(images);
  },
};
