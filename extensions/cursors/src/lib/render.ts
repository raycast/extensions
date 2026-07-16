import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { PngSize } from "../interface";

let wasmReady: Promise<void> | undefined;

/**
 * Initialize the resvg WASM module exactly once, loading the binary via the
 * caller-supplied `loadWasm` thunk. In the extension this reads `resvg.wasm`
 * from `environment.assetsPath`; in tests it reads from `node_modules`.
 * Safe to call repeatedly — the underlying init runs a single time.
 */
export function ensureWasm(loadWasm: () => Promise<Uint8Array>): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(loadWasm()).catch((error) => {
      // Reset so a later call can retry rather than reusing a rejected promise.
      wasmReady = undefined;
      throw error;
    });
  }
  return wasmReady;
}

/**
 * Strip the intrinsic `width`/`height` attributes from the **root `<svg>` tag
 * only**, leaving any sized child elements (`<rect>`, `<image>`, …) untouched.
 * With the root dimensions gone, resvg renders from the `viewBox` as true
 * vector art — scaling up to 512px stays crisp instead of upscaling a 32px
 * raster.
 */
export function stripRootDimensions(svg: string): string {
  return svg.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(?:width|height)="[^"]*"/g, ""));
}

/**
 * Rasterize a cursor's SVG into a transparent PNG buffer, `size`px wide/tall.
 * `ensureWasm` must have resolved first.
 */
export function renderCursorPng(svg: string, size: PngSize): Uint8Array {
  const resvg = new Resvg(stripRootDimensions(svg), {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  return resvg.render().asPng();
}
