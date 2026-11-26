import { describe, expect, it } from "vitest";
import { composite, formatColor, nearestTailwind, parseColor, resolvePair, toHex } from "../src/lib/color";

describe("parseColor", () => {
  it.each([
    ["#A2D26B", "#a2d26b"],
    ["A2D26B", "#a2d26b"],
    ["#abc", "#aabbcc"],
    ["fff", "#ffffff"],
    ["rgb(118 118 118)", "#767676"],
    ["rgb(118, 118, 118)", "#767676"],
    ["hsl(0 0% 100%)", "#ffffff"],
    ["oklch(0.6 0 0)", "#808080"],
    ["rebeccapurple", "#663399"],
    ["text-neutral-500", "#737373"],
    ["bg-white", "#ffffff"],
    ["hover:bg-slate-900", "#0f172b"],
    ["slate-900", "#0f172b"],
    ['"#aaaaaa";', "#aaaaaa"],
  ])("parses %s", (input, hex) => {
    const color = parseColor(input);
    expect(color).toBeDefined();
    expect(toHex(color!)).toBe(hex);
  });

  it.each(["", "   ", "hello world", "#12", "text-notacolor-500", "12px"])("rejects %j", (input) => {
    expect(parseColor(input)).toBeUndefined();
  });

  it("keeps alpha from 8-digit hex, rgba and Tailwind opacity", () => {
    expect(parseColor("#00000080")!.alpha).toBeCloseTo(0.5, 2);
    expect(parseColor("rgb(0 0 0 / 25%)")!.alpha).toBeCloseTo(0.25, 2);
    expect(parseColor("bg-black/40")!.alpha).toBeCloseTo(0.4, 2);
  });
});

describe("compositing", () => {
  it("blends 50% black (0x80) over white to #7f7f7f", () => {
    expect(toHex(composite(parseColor("#00000080")!, { r: 1, g: 1, b: 1 }))).toBe("#7f7f7f");
  });

  it("puts a transparent background over white first", () => {
    const { fg, bg } = resolvePair(parseColor("#000")!, parseColor("rgb(0 0 0 / 0%)")!);
    expect(toHex(bg)).toBe("#ffffff");
    expect(toHex(fg)).toBe("#000000");
  });
});

describe("formats", () => {
  const gray = parseColor("#767676")!;
  it("formats as hex, rgb and oklch", () => {
    expect(formatColor(gray, "hex")).toBe("#767676");
    expect(formatColor(gray, "rgb")).toBe("rgb(118 118 118)");
    expect(formatColor(gray, "oklch")).toMatch(/^oklch\(0\.\d+ 0 0\)$/);
  });

  it("finds the nearest Tailwind color", () => {
    expect(nearestTailwind(parseColor("#737373")!)).toMatchObject({ name: "neutral-500", exact: true });
    expect(nearestTailwind(parseColor("#767676")!).exact).toBe(false);
  });
});
