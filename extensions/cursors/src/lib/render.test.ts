import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureWasm, renderCursorPng, stripRootDimensions } from "./render";
import { PNG_SIZES } from "../interface";
import { cursors } from "../data/cursors";

// Vitest runs from the repo root, so resolve the WASM relative to cwd.
const WASM_PATH = join(process.cwd(), "node_modules/@resvg/resvg-wasm/index_bg.wasm");

/** Read a PNG's IHDR chunk: returns width, height, and color type. */
function readPngHeader(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  // PNG signature (8 bytes) + IHDR length (4) + "IHDR" (4) → width at offset 16.
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const colorType = view.getUint8(25); // 6 = truecolor + alpha (RGBA)
  return { width, height, colorType };
}

// A representative cursor with both white and black fills.
const defaultCursor = cursors.find((c) => c.id === "default")!;

beforeAll(async () => {
  await ensureWasm(() => readFile(WASM_PATH));
});

describe("renderCursorPng", () => {
  it("produces a PNG at the requested size for every supported size", () => {
    for (const size of PNG_SIZES) {
      const png = renderCursorPng(defaultCursor.svg, size);
      // PNG magic number: 0x89 'P' 'N' 'G'.
      expect(png[0]).toBe(0x89);
      expect(String.fromCharCode(png[1], png[2], png[3])).toBe("PNG");
      const header = readPngHeader(png);
      expect(header.width).toBe(size);
      expect(header.height).toBe(size);
    }
  });

  it("emits a truecolor + alpha (RGBA) PNG", () => {
    const png = renderCursorPng(defaultCursor.svg, 128);
    expect(readPngHeader(png).colorType).toBe(6);
  });

  it("renders every bundled cursor without throwing", () => {
    for (const cursor of cursors) {
      const png = renderCursorPng(cursor.svg, 32);
      expect(png.length).toBeGreaterThan(0);
      expect(readPngHeader(png).width).toBe(32);
    }
  });

  it("scales up crisply — a 512px render is materially larger than a 16px one", () => {
    // A vector render gains real detail with size; an upscaled raster would not.
    const small = renderCursorPng(defaultCursor.svg, 16);
    const large = renderCursorPng(defaultCursor.svg, 512);
    expect(readPngHeader(small).width).toBe(16);
    expect(readPngHeader(large).width).toBe(512);
    expect(large.length).toBeGreaterThan(small.length);
  });
});

describe("stripRootDimensions", () => {
  it("removes width/height from the root <svg> tag", () => {
    const result = stripRootDimensions('<svg width="32" height="32" viewBox="0 0 32 32"><path/></svg>');
    expect(result).toBe('<svg viewBox="0 0 32 32"><path/></svg>');
  });

  it("preserves width/height on child elements", () => {
    // The whole point of the fix: a sized <rect>/<image> child must survive so
    // future colored/gradient cursors with sized children still export.
    const svg = '<svg width="32" height="32" viewBox="0 0 32 32"><rect x="8" y="8" width="16" height="16"/></svg>';
    const result = stripRootDimensions(svg);
    expect(result).toContain('<rect x="8" y="8" width="16" height="16"/>');
    // Root dims gone…
    expect(result).toMatch(/<svg viewBox="0 0 32 32">/);
  });

  it("renders a cursor with a sized child element without collapsing it", () => {
    // Round-trip through the real renderer: a sized child must still paint.
    const svg =
      '<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="24" height="24" fill="#123456"/></svg>';
    const png = renderCursorPng(svg, 64);
    expect(readPngHeader(png).width).toBe(64);
    expect(png.length).toBeGreaterThan(100);
  });
});
