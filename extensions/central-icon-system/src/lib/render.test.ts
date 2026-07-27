import { describe, expect, it, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { ensureWasm, renderIconPng } from "./render";

const OUTLINED =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
  '<path d="M3.75 8.75L12 2L20.25 8.75V20.25H3.75V8.75Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
  "</svg>";

/** PNG signature + IHDR width/height, so we assert real pixels, not just bytes. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) throw new Error("Not a PNG");
  }
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Count fully transparent pixels is not possible without decoding; use size as a proxy. */
beforeAll(async () => {
  await ensureWasm(async () => new Uint8Array(await readFile("node_modules/@resvg/resvg-wasm/index_bg.wasm")));
});

describe("renderIconPng", () => {
  it("renders at the requested size, not the 24px root dimension", () => {
    // The stripRootDimensions guard: without it resvg honors width="24" and
    // emits a 24px image regardless of fitTo.
    const png = renderIconPng(OUTLINED, 512, "#000000");
    expect(pngSize(png)).toEqual({ width: 512, height: 512 });
  });

  it("renders every offered size", () => {
    for (const size of [16, 32, 64, 128, 256, 512] as const) {
      expect(pngSize(renderIconPng(OUTLINED, size, "#000000"))).toEqual({ width: size, height: size });
    }
  });

  it("produces different bytes for different colors", () => {
    // Proves currentColor is actually substituted rather than rendering black
    // both times.
    const black = renderIconPng(OUTLINED, 64, "#000000");
    const red = renderIconPng(OUTLINED, 64, "#FF0000");
    expect(Buffer.from(black).equals(Buffer.from(red))).toBe(false);
  });

  it("a larger render carries more data than a smaller one", () => {
    const small = renderIconPng(OUTLINED, 32, "#000000");
    const large = renderIconPng(OUTLINED, 512, "#000000");
    expect(large.byteLength).toBeGreaterThan(small.byteLength);
  });

  it("does not leak WASM memory across repeated renders", () => {
    // The crash that killed this command twice: `Resvg` handles live in WASM
    // linear memory, which only grows and is invisible to the JS GC. Unfreed,
    // this loop climbed ~1.4 MB per render (200 renders → 331 MB RSS) and blew
    // Raycast's 100 MB cap. With free() it plateaus.
    const before = process.memoryUsage().rss;
    for (let i = 0; i < 150; i += 1) renderIconPng(OUTLINED, 512, "#808080");
    const growthMb = (process.memoryUsage().rss - before) / 1e6;

    // Unfreed this exceeds 200 MB; freed it settles well under.
    expect(growthMb).toBeLessThan(100);
  });
});
