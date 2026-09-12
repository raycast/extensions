import { describe, expect, it } from "vitest";
import {
  BlankCaptureError,
  cropAndPad,
  prepareTexTellerInput,
  type GrayImage,
} from "../lib/preprocess";

function whiteImage(width: number, height: number): GrayImage {
  return { width, height, data: new Float32Array(width * height).fill(255) };
}

describe("image preprocessing", () => {
  it("crops foreground and pads dimensions to multiples of 32", () => {
    const image = whiteImage(50, 40);
    for (let y = 10; y < 20; y += 1) {
      for (let x = 5; x < 25; x += 1) image.data[y * image.width + x] = 0;
    }
    const result = cropAndPad(image);
    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    expect(result.data[0]).toBe(0);
    expect(result.data.at(-1)).toBe(255);
  });

  it("rejects blank selections", () => {
    expect(() => cropAndPad(whiteImage(32, 32))).toThrow(BlankCaptureError);
  });

  it("produces TexTeller3's normalized 448x448 NCHW input", () => {
    const image = whiteImage(32, 32);
    image.data[0] = 0;
    const input = prepareTexTellerInput(image);
    expect(input.dimensions).toEqual([1, 1, 448, 448]);
    expect(input.data).toHaveLength(448 * 448);
    expect(Number.isFinite(input.data[0])).toBe(true);
  });
});
