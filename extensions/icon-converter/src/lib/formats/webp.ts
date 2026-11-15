import webpDec from "@jsquash/webp/codec/dec/webp_dec.js";
import webpEnc from "@jsquash/webp/codec/enc/webp_enc.js";
import { defaultOptions } from "@jsquash/webp/meta.js";
import { startCodec } from "../assets";
import { toRGBA } from "../image";
import type { InputFormat, OutputFormat } from "../types";

interface Decoder {
  decode(data: Uint8Array): { width: number; height: number; data: Uint8ClampedArray } | null;
}
interface Encoder {
  encode(data: Uint8ClampedArray, width: number, height: number, options: typeof defaultOptions): Uint8Array | null;
}

let decoder: Promise<Decoder> | undefined;
let encoder: Promise<Encoder> | undefined;

export const fromWebp: InputFormat = {
  id: "webp",
  label: "WebP",
  extensions: ["webp"],
  async open(bytes) {
    decoder ??= startCodec<Decoder>(webpDec, "webp_dec.wasm");
    const out = (await decoder).decode(bytes);
    if (!out) throw new Error("Not a valid WebP image");
    const img = toRGBA(out.width, out.height, new Uint8ClampedArray(out.data));
    return { raster: async () => img };
  },
};

export const toWebp: OutputFormat = {
  id: "webp",
  label: "WebP",
  extension: "webp",
  options: ["quality"],
  sizable: true,
  async write(source, options) {
    encoder ??= startCodec<Encoder>(webpEnc, "webp_enc.wasm");
    const img = await source.raster();
    const lossless = options.quality === "lossless";
    const out = (await encoder).encode(img.data, img.width, img.height, {
      ...defaultOptions,
      quality: typeof options.quality === "number" ? options.quality : lossless ? 100 : 85,
      lossless: lossless ? 1 : 0,
      // Keep colour under fully transparent pixels untouched in lossless mode.
      exact: lossless ? 1 : 0,
    });
    if (!out) throw new Error("WebP encoding failed");
    return new Uint8Array(out);
  },
};
