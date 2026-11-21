import * as jpeg from "jpeg-js";
import { flatten, orient, toRGBA } from "../image";
import type { InputFormat, OutputFormat } from "../types";

/** Read the EXIF orientation tag (1-8); 1 when absent. */
export function exifOrientation(b: Uint8Array): number {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 4 || v.getUint16(0) !== 0xffd8) return 1;
  let p = 2;
  while (p + 4 <= b.length) {
    const marker = v.getUint16(p);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    const size = v.getUint16(p + 2);
    // APP1 segment starting with "Exif\0\0"
    if (marker === 0xffe1 && p + 10 <= b.length && v.getUint32(p + 4) === 0x45786966) {
      const tiff = p + 10;
      if (tiff + 8 > b.length) return 1;
      const le = v.getUint16(tiff) === 0x4949;
      const ifd = tiff + v.getUint32(tiff + 4, le);
      if (ifd + 2 > b.length) return 1;
      const count = v.getUint16(ifd, le);
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > b.length) return 1;
        if (v.getUint16(entry, le) === 0x0112) return v.getUint16(entry + 8, le);
      }
      return 1;
    }
    p += 2 + size;
  }
  return 1;
}

export const fromJpg: InputFormat = {
  id: "jpg",
  label: "JPG",
  extensions: ["jpg", "jpeg"],
  async open(bytes) {
    const raw = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 2048 });
    const img = orient(toRGBA(raw.width, raw.height, new Uint8ClampedArray(raw.data)), exifOrientation(bytes));
    return { raster: async () => img };
  },
};

export const toJpg: OutputFormat = {
  id: "jpg",
  label: "JPG",
  extension: "jpg",
  options: ["quality", "background"],
  sizable: true,
  async write(source, options) {
    const img = flatten(await source.raster(), options.background ?? [255, 255, 255]);
    const quality = typeof options.quality === "number" ? options.quality : 90;
    return jpeg.encode({ width: img.width, height: img.height, data: img.data }, quality).data;
  },
};
