import { describe, expect, it } from "vitest";
import { getSupersampledSize, parseSvgPixelDimensions } from "../svg-preview";

describe("parseSvgPixelDimensions", () => {
  it("parses width and height attributes", () => {
    const svg = '<svg width="304.79" height="535.64" viewBox="0 0 304.79 535.64"></svg>';
    expect(parseSvgPixelDimensions(svg)).toEqual({ width: 304.79, height: 535.64 });
  });

  it("parses px width/height attributes", () => {
    const svg = '<svg width="640px" height="480px"></svg>';
    expect(parseSvgPixelDimensions(svg)).toEqual({ width: 640, height: 480 });
  });

  it("falls back to viewBox dimensions", () => {
    const svg = '<svg viewBox="0 0 1200 800"></svg>';
    expect(parseSvgPixelDimensions(svg)).toEqual({ width: 1200, height: 800 });
  });
});

describe("getSupersampledSize", () => {
  it("applies factor directly when under cap", () => {
    const size = getSupersampledSize({ width: 300, height: 200 }, 3, 4096);
    expect(size).toEqual({ width: 900, height: 600 });
  });

  it("caps by max edge while preserving ratio", () => {
    const size = getSupersampledSize({ width: 2000, height: 1000 }, 3, 4096);
    expect(size).toEqual({ width: 4096, height: 2048 });
  });
});
