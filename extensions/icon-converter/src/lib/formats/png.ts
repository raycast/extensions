import { PNG } from "pngjs";
import { toRGBA, type RGBA } from "../image";
import type { InputFormat, OutputFormat } from "../types";

export function decodePng(bytes: Uint8Array): RGBA {
  const png = PNG.sync.read(Buffer.from(bytes));
  return toRGBA(png.width, png.height, new Uint8ClampedArray(png.data));
}

export function encodePng(img: RGBA): Uint8Array {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  return PNG.sync.write(png);
}

export const fromPng: InputFormat = {
  id: "png",
  label: "PNG",
  extensions: ["png"],
  async open(bytes) {
    const img = decodePng(bytes);
    return { raster: async () => img };
  },
};

export const toPng: OutputFormat = {
  id: "png",
  label: "PNG",
  extension: "png",
  options: [],
  sizable: true,
  async write(source) {
    return encodePng(await source.raster());
  },
};
