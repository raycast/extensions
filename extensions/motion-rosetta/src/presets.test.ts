import { describe, expect, it } from "vitest";
import { CSS_PRESETS, BROWSE_PRESETS } from "./presets.ts";
import { parse } from "./lib/parse.ts";
import { curveValue } from "./lib/model.ts";
import { backIn, backOut } from "motion";
import { convert } from "./lib/convert.ts";

it("exposes distinct sourced presets and preserves spring incompatibility", () => {
  expect(BROWSE_PRESETS).toHaveLength(13);
  expect(new Set(BROWSE_PRESETS.map((p) => p.input)).size).toBe(13);
  for (const preset of BROWSE_PRESETS)
    expect(() => convert(preset.input)).not.toThrow();
  const playful = convert(
    BROWSE_PRESETS.find((p) => p.name === "Playful")!.input,
  );
  expect(playful.easing.kind).toBe("spring");
  expect(playful.outputs.find((o) => o.id === "css-bezier")!.fidelity).toBe(
    "Unavailable",
  );
});
it("matches Motion Back curves, including the reversed handles", () => {
  for (const [name, evaluate] of [
    ["Back In", backIn],
    ["Back Out", backOut],
  ] as const) {
    const curve = parse(
      BROWSE_PRESETS.find((p) => p.name === name)!.input,
    ).easing;
    if (curve.kind !== "bezier") throw new Error("Expected Bézier");
    for (let i = 0; i <= 100; i++)
      expect(
        Math.abs(curveValue(curve, i / 100) - evaluate(i / 100)),
      ).toBeLessThan(0.002);
  }
});

describe("CSS keyword definitions, separate from Figma", () => {
  it("offers five valid, distinct presets without any Figma attribution", () => {
    expect(CSS_PRESETS.map((preset) => preset.name)).toEqual([
      "Linear",
      "Ease In",
      "Ease Out",
      "Ease In Out",
      "Ease",
    ]);
    expect(new Set(CSS_PRESETS.map((preset) => preset.input)).size).toBe(5);
    for (const preset of CSS_PRESETS) {
      expect(parse(preset.input).format).toContain("CSS keyword");
      expect(parse(preset.input).easing.kind).toBe("bezier");
    }
  });
  it.each([
    ["linear", [0, 0, 1, 1]],
    ["ease", [0.25, 0.1, 0.25, 1]],
    ["ease-in", [0.42, 0, 1, 1]],
    ["ease-out", [0, 0, 0.58, 1]],
    ["ease-in-out", [0.42, 0, 0.58, 1]],
  ])("parses %s", (keyword, points) => {
    expect(parse(keyword as string).easing).toEqual({ kind: "bezier", points });
  });
  it("handles CSS case-insensitivity and linear identity", () => {
    expect(parse(" EASE-IN; ").easing).toEqual(parse("ease-in").easing);
    const easing = parse("linear").easing;
    if (easing.kind === "spring") throw new Error("Expected curve");
    expect(curveValue(easing, 0.37)).toBeCloseTo(0.37, 8);
  });
});
