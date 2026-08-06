import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { getImageDimensions } from "./imageDimensions";

const FIXTURES_DIR = join(__dirname, "__fixtures__");

function loadFixture(filename: string): Buffer {
  return readFileSync(join(FIXTURES_DIR, filename));
}

// All fixtures below are REAL image files generated with Python3/Pillow at known dimensions
// (not hand-typed byte arrays), so a subtle mistake in a hand-crafted buffer can't mask a bug
// in the parser. See task report for the exact generation script.
describe("getImageDimensions", () => {
  it.each([
    ["sample-50x30.png", 50, 30],
    ["sample-300x300.png", 300, 300],
    ["sample-800x200.png", 800, 200],
  ])("reads correct dimensions from a real PNG file (%s)", (filename, width, height) => {
    const buffer = loadFixture(filename);
    expect(getImageDimensions(buffer)).toEqual({ width, height });
  });

  it.each([
    ["sample-50x30.jpg", 50, 30],
    ["sample-300x300.jpg", 300, 300],
    ["sample-800x200.jpg", 800, 200],
  ])("reads correct dimensions from a real baseline JPEG file (%s)", (filename, width, height) => {
    const buffer = loadFixture(filename);
    expect(getImageDimensions(buffer)).toEqual({ width, height });
  });

  it("reads correct dimensions from a real progressive JPEG file (SOF2 marker)", () => {
    const buffer = loadFixture("sample-progressive-640x480.jpg");
    expect(getImageDimensions(buffer)).toEqual({ width: 640, height: 480 });
  });

  it("reads correct dimensions from a real lossy WebP file (VP8 chunk)", () => {
    // Generated via Pillow's default `img.save(path, "WEBP")`; confirmed by inspecting the
    // file's bytes 12-16 that this produces a "VP8 " fourCC.
    const buffer = loadFixture("sample-50x30.webp");
    expect(getImageDimensions(buffer)).toEqual({ width: 50, height: 30 });
  });

  it("reads correct dimensions from a real lossless WebP file (VP8L chunk)", () => {
    // Generated via Pillow's `img.save(path, "WEBP", lossless=True)`; confirmed by inspecting
    // the file's bytes 12-16 that this produces a "VP8L" fourCC.
    const buffer = loadFixture("sample-300x300.webp");
    expect(getImageDimensions(buffer)).toEqual({ width: 300, height: 300 });
  });

  it("reads correct dimensions from a real RGBA WebP file (VP8X chunk)", () => {
    // Generated via Pillow with an RGBA image (`Image.new("RGBA", ...)`) saved as WEBP;
    // confirmed by inspecting the file's bytes 12-16 that Pillow wraps the alpha-channel image
    // in an extended "VP8X" container (unlike a plain lossless RGBA save, which was observed to
    // still emit a bare "VP8L" chunk).
    const buffer = loadFixture("sample-800x200-alpha.webp");
    expect(getImageDimensions(buffer)).toEqual({ width: 800, height: 200 });
  });

  it("returns undefined for a RIFF file that isn't WEBP", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // fake file size
      Buffer.from("WAVE", "ascii"),
      Buffer.alloc(20), // padding so length checks pass; fourCC area is irrelevant here
    ]);
    expect(getImageDimensions(buffer)).toBeUndefined();
  });

  it("returns undefined for a WebP-signed buffer truncated before the chunk payload", () => {
    const truncated = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP", "ascii"),
      Buffer.from("VP8 ", "ascii"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // chunk size, then nothing else - no payload
    ]);
    expect(getImageDimensions(truncated)).toBeUndefined();
  });

  it("returns undefined for random non-image bytes", () => {
    const buffer = Buffer.from("this is just plain text, not an image at all, definitely not");
    expect(getImageDimensions(buffer)).toBeUndefined();
  });

  it("returns undefined for an empty buffer", () => {
    expect(getImageDimensions(Buffer.alloc(0))).toBeUndefined();
  });

  it("returns undefined for a too-short buffer", () => {
    expect(getImageDimensions(Buffer.from([0x89, 0x50]))).toBeUndefined();
  });

  it("returns undefined for a buffer with a valid PNG signature but truncated before IHDR", () => {
    const truncated = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // valid PNG signature
      Buffer.from([0x00, 0x00, 0x00, 0x0d]), // start of IHDR chunk length, then nothing else
    ]);
    expect(getImageDimensions(truncated)).toBeUndefined();
  });

  it("returns undefined for a buffer with a valid JPEG SOI marker but no SOF segment", () => {
    // SOI followed immediately by EOI, no frame header at all.
    const truncated = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    expect(getImageDimensions(truncated)).toBeUndefined();
  });
});
