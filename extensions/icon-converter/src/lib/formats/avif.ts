import avifDec from "@jsquash/avif/codec/dec/avif_dec.js";
import { startCodec } from "../assets";
import { toRGBA } from "../image";
import type { InputFormat } from "../types";

interface Decoder {
  decode(data: Uint8Array, bitDepth: 8): { width: number; height: number; data: Uint8ClampedArray } | null;
}

let decoder: Promise<Decoder> | undefined;

export const fromAvif: InputFormat = {
  id: "avif",
  label: "AVIF",
  extensions: ["avif"],
  async open(bytes) {
    decoder ??= startCodec<Decoder>(avifDec, "avif_dec.wasm");
    const out = (await decoder).decode(bytes, 8);
    if (!out) throw new Error("Not a valid AVIF image");
    const img = toRGBA(out.width, out.height, new Uint8ClampedArray(out.data));
    return { raster: async () => img };
  },
};
