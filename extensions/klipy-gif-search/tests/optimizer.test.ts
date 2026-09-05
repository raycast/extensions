import { decode, decodeFrames, encode } from "modern-gif";
import { describe, expect, it } from "vitest";
import { optimizeGif, readResponseBytes, sampleFrames } from "../src/optimizer";

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
  it("keeps the final composited state when sampling frames", () => {
    const frames = [1, 2, 3, 4].map((value) => ({
      width: 1,
      height: 1,
      delay: value * 10,
      data: new Uint8ClampedArray([value, 0, 0, 255]),
    }));

    const sampled = sampleFrames(frames, 2);

    expect(sampled.map((frame) => frame.data[0])).toEqual([2, 4]);
    expect(sampled.map((frame) => frame.delay)).toEqual([30, 70]);
  });

  it("stops reading a response when its streamed body exceeds the limit", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5, 6]));
      },
      cancel() {
        cancelled = true;
      },
    });
    const response = new Response(body);

    await expect(readResponseBytes(response, 5)).rejects.toThrow(
      "GIF is larger than the 100 MB safety limit",
    );
    expect(cancelled).toBe(true);
  });

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
