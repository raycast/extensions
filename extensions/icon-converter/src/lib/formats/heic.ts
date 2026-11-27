import decodeHeic from "heic-decode";
import { toRGBA } from "../image";
import type { InputFormat } from "../types";

export const fromHeic: InputFormat = {
  id: "heic",
  label: "HEIC",
  extensions: ["heic", "heif"],
  async open(bytes) {
    const out = await decodeHeic({ buffer: bytes });
    const img = toRGBA(out.width, out.height, new Uint8ClampedArray(out.data));
    return { raster: async () => img };
  },
};
