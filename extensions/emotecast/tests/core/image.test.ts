import { describe, expect, it } from "vitest";
import { readImageInfo } from "../../src/core/image";

function gif(width: number, height: number): Buffer {
  const buf = Buffer.alloc(13);
  buf.write("GIF89a", 0, "latin1");
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

function png(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(0x89504e47, 0);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function webpVp8x(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write("RIFF", 0, "latin1");
  buf.write("WEBP", 8, "latin1");
  buf.write("VP8X", 12, "latin1");
  buf.writeUIntLE(width - 1, 24, 3);
  buf.writeUIntLE(height - 1, 27, 3);
  return buf;
}

describe("readImageInfo", () => {
  it("reads GIF dimensions from the logical screen descriptor", () => {
    expect(readImageInfo(gif(32, 32))).toEqual({
      width: 32,
      height: 32,
      format: "gif",
    });
  });

  it("reads non-square GIF dimensions", () => {
    expect(readImageInfo(gif(232, 128))).toMatchObject({
      width: 232,
      height: 128,
    });
  });

  it("reads PNG dimensions from the IHDR chunk", () => {
    expect(readImageInfo(png(128, 128))).toEqual({
      width: 128,
      height: 128,
      format: "png",
    });
  });

  it("reads extended WebP dimensions, which are stored minus one", () => {
    expect(readImageInfo(webpVp8x(112, 112))).toEqual({
      width: 112,
      height: 112,
      format: "webp",
    });
  });

  it("returns undefined for an unknown format", () => {
    expect(readImageInfo(Buffer.from("not an image at all, really"))).toBeUndefined();
  });

  it("returns undefined rather than throwing on a truncated buffer", () => {
    expect(readImageInfo(Buffer.from("GIF"))).toBeUndefined();
    expect(readImageInfo(Buffer.alloc(0))).toBeUndefined();
  });

  it("does not mistake a RIFF container that is not WebP", () => {
    const wav = Buffer.alloc(30);
    wav.write("RIFF", 0, "latin1");
    wav.write("WAVE", 8, "latin1");
    expect(readImageInfo(wav)).toBeUndefined();
  });
});
