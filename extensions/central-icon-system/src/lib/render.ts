/**
 * SVG → PNG rasterization via `@resvg/resvg-wasm`.
 *
 * Pure WASM, no native binary — verified as the only approach with precedent in
 * the merged Raycast extension corpus (`sharp` and native `@resvg/resvg-js`
 * appear only as devDependencies anywhere in raycast/extensions).
 *
 * Kept free of Raycast imports so it can be unit-tested against the WASM binary
 * in `node_modules` rather than `environment.assetsPath`.
 */

import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { PngSize } from "../types";
import { stripRootDimensions, withColor } from "./svg";

let wasmReady: Promise<void> | undefined;

/**
 * Initialize the resvg WASM module exactly once, loading the binary via the
 * caller-supplied thunk. Safe to call repeatedly — the underlying init runs a
 * single time, and a failure resets the latch so a later call can retry rather
 * than reusing a rejected promise.
 */
export function ensureWasm(loadWasm: () => Promise<Uint8Array>): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(loadWasm()).catch((error) => {
      wasmReady = undefined;
      throw error;
    });
  }
  return wasmReady;
}

/**
 * Rasterize an icon to a transparent PNG, `size`px square.
 *
 * Two steps matter here and neither is optional:
 *
 * 1. `currentColor` is substituted for an explicit color. A rasterizer has no
 *    inherited color to resolve it against, so an unsubstituted icon renders
 *    black — invisible on the transparent background we export.
 * 2. Root `width`/`height` are stripped, so resvg renders from the `viewBox` as
 *    vector art. Left in place, every export is a 24px raster upscaled to the
 *    requested size.
 *
 * `ensureWasm` must have resolved first.
 */
export function renderIconPng(svg: string, size: PngSize, color: string): Uint8Array {
  const prepared = stripRootDimensions(withColor(svg, color));

  // `Resvg` and its render output are wasm-bindgen handles into the WASM linear
  // memory, which only ever GROWS — the JS garbage collector cannot reclaim it.
  // Without `free()`, RSS climbs ~1.4 MB per render and blows Raycast's 100 MB
  // limit after roughly 30 icons. Measured: 200 renders reach 331 MB unfreed vs
  // 122 MB freed. Both handles must be released, in a `finally` so a render
  // failure doesn't leak.
  let resvg: InstanceType<typeof Resvg> | undefined;
  let rendered: ReturnType<InstanceType<typeof Resvg>["render"]> | undefined;
  try {
    resvg = new Resvg(prepared, {
      fitTo: { mode: "width", value: size },
      background: "rgba(0,0,0,0)",
    });
    rendered = resvg.render();
    return rendered.asPng();
  } finally {
    rendered?.free();
    resvg?.free();
  }
}
