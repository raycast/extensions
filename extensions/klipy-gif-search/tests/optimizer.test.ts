import { decode, decodeFrames, encode } from "modern-gif";
import { describe, expect, it } from "vitest";
import { optimizeGif } from "../src/optimizer";

function noisyFrame(width: number, height: number, seed: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  let state = seed;
  for (let index = 0; index < data.length; index += 4) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[index] = state & 255;
    data[index + 1] = (state >>> 8) & 255;
    data[index + 2] = (state >>> 16) & 255;
    data[index + 3] = 255;
  }
  return { data: data as unknown as ArrayBufferView<ArrayBuffer>, delay: 80 };
}

describe("optimizeGif", () => {
  it("preserves compliant GIFs unless optimization is forced", async () => {
    const source = new Uint8Array(
      await encode({
        width: 16,
        height: 16,
        frames: [noisyFrame(16, 16, 1)],
        maxColors: 255,
        looped: true,
      }),
    );
    const options = { maxBytes: source.byteLength * 2, maxDimension: 32 };

    expect(await optimizeGif(source, options)).toBe(source);
    expect(
      await optimizeGif(source, { ...options, forceOptimization: true }),
    ).not.toBe(source);
  });

  it("produces a valid animated GIF below the requested ceiling", async () => {
    const width = 180;
    const height = 120;
    const source = new Uint8Array(
      await encode({
        width,
        height,
        frames: Array.from({ length: 10 }, (_, index) =>
          noisyFrame(width, height, index + 1),
        ),
        maxColors: 255,
        looped: true,
      }),
    );
    const target = 80 * 1024;
    const output = await optimizeGif(source, {
      maxBytes: target,
      maxDimension: 120,
    });
    const gif = decode(output as unknown as ArrayBuffer);
    const frames = decodeFrames(output as unknown as ArrayBuffer, { gif });

    expect(output.byteLength).toBeLessThanOrEqual(target);
    expect(Math.max(gif.width, gif.height)).toBeLessThanOrEqual(120);
    expect(frames.length).toBeGreaterThan(1);
  }, 30_000);
});
