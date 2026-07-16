import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureWasm, renderCursorPng } from "./render";
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
