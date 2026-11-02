import chroma from "chroma-js";
import { describe, expect, it } from "vitest";
import { calculateAdjustedBrightness, getClosestBrightness, hexToXy, xyToRgbHexString } from "../src/helpers/colors";
import { COLORS } from "../src/helpers/constants";

// sRGB's transfer function. Scaling in linear light keeps a color's chromaticity.
const toLinear = (c: number) => (c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92);
const toGamma = (c: number) => (c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c);

function atFullBrightness(color: string) {
  const linear = chroma(color).gl().slice(0, 3).map(toLinear);
  const max = Math.max(...linear);
  const [r, g, b] = linear.map((c) => toGamma(c / max));
  return chroma.gl(r, g, b);
}

describe("hexToXy and xyToRgbHexString", () => {
  it.each(COLORS)("$name round trips at full brightness", ({ value }) => {
    const roundTripped = xyToRgbHexString(hexToXy(value).xy);
    expect(chroma.deltaE(roundTripped, atFullBrightness(value))).toBeLessThan(3);
  });
});

describe("xyToRgbHexString", () => {
  it("gives a hex color for every xy in the unit square", () => {
    const steps = Array.from({ length: 21 }, (_, i) => i);
    const grid = steps.flatMap((i) => steps.filter((j) => j > 0 && i + j <= 20).map((j) => ({ x: i / 20, y: j / 20 })));
    expect(grid.filter((xy) => !/^#[0-9a-f]{6}$/.test(xyToRgbHexString(xy)))).toEqual([]);
  });

  it("gives black for y = 0", () => {
    expect(xyToRgbHexString({ x: 0.3, y: 0 })).toBe("#000000");
  });
});

describe("getClosestBrightness", () => {
  it.each([
    [0, 1],
    [4, 1],
    [6, 10],
    [56.52, 60],
    [94, 90],
    [96, 100],
    [120, 100],
  ])("rounds %s to %s", (brightness, closest) => {
    expect(getClosestBrightness(brightness)).toBe(closest);
  });
});

describe("calculateAdjustedBrightness", () => {
  it.each<["increase" | "decrease", number, number]>([
    ["increase", 50, 60],
    ["decrease", 50, 40],
    ["increase", 56.52, 70],
    ["decrease", 56.52, 50],
    ["decrease", 10, 1],
    ["increase", 1, 10],
    ["increase", 97, 100],
    ["decrease", 3, 1],
    ["increase", 100, 100],
    ["decrease", 1, 1],
  ])("%s from %s gives %s", (direction, brightness, adjusted) => {
    expect(calculateAdjustedBrightness(brightness, direction)).toBe(adjusted);
  });
});
