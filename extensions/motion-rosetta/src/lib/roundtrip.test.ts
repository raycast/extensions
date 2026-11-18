import { expect, it } from "vitest";
import { convert } from "./convert.ts";
import { previewDuration } from "./preview.ts";
import { durationLabel } from "./detail-layout.ts";
import { sheetTravel } from "./retina-preview.ts";

it.each([0, 0.001, 0.5, 0.8, 10, 60])(
  "preserves a pasted SwiftUI duration of %s across outputs and preview",
  (duration) => {
    const value = convert(
      `.timingCurve(0.42, 0, 0.58, 1, duration: ${duration})`,
    );
    expect(value.format).toBe("SwiftUI timing curve");
    expect(value.easing).toEqual({
      kind: "bezier",
      points: [0.42, 0, 0.58, 1],
      duration,
    });
    expect(previewDuration(value.easing)).toBe(duration);
    expect(durationLabel(value.easing)).toContain(
      duration > 0 && duration < 0.01
        ? `${(duration * 1000).toFixed(2)}ms`
        : `${duration.toFixed(2)}s`,
    );
    expect(value.outputs.find((o) => o.id === "swiftui")!.code).toContain(
      `duration: ${duration})`,
    );
    expect(value.outputs.find((o) => o.id === "motion")!.code).toContain(
      `duration: ${duration}`,
    );
    expect(
      Number.isFinite(
        sheetTravel({
          easing: value.easing,
          duration,
          appearance: "dark",
          component: "Sheet",
        }),
      ),
    ).toBe(true);
  },
);

it.each([
  "figma",
  "figma-css",
  "css-bezier",
  "motion",
  "swiftui",
  "compose",
  "tailwind",
  "dtcg",
])("round-trips Bézier output %s", (id) => {
  const original = convert("0.42, -0.2, 0.58, 1.2");
  const output = original.outputs.find((o) => o.id === id)!;
  const pasted = convert(output.code!);
  expect(pasted.easing.kind).toBe("bezier");
  if (pasted.easing.kind === "bezier")
    expect(pasted.easing.points).toEqual([0.42, -0.2, 0.58, 1.2]);
});

it.each(["css-bezier", "motion", "swiftui", "tailwind", "compose", "dtcg"])(
  "round-trips duration-bearing output %s",
  (id) => {
    const output = convert("ease-out", 0.8).outputs.find((o) => o.id === id)!;
    const pasted = convert(output.code!);
    expect(previewDuration(pasted.easing)).toBe(0.8);
  },
);

it("round-trips physical SwiftUI springs and rejects duration-only DTCG without inventing motion", () => {
  const source = convert("{mass:2,stiffness:200,damping:20,velocity:3}");
  const swift = source.outputs.find((o) => o.id === "swiftui")!.code!;
  expect(convert(swift).easing).toEqual(source.easing);
  expect(() =>
    convert(source.outputs.find((o) => o.id === "dtcg")!.code!),
  ).toThrow("cannot reconstruct");
  expect(() =>
    convert("transition-timing-function: ".repeat(6) + "ease"),
  ).toThrow("Nested");
});

it("accepts sampled spring CSS and Tailwind output without inventing a spring", () => {
  for (const input of [
    ".spring(duration: 0.5, bounce: 0.6)",
    ".spring(duration: 0.001, bounce: 1)",
  ])
    for (const id of ["css-linear", "tailwind"]) {
      const code = convert(input).outputs.find((o) => o.id === id)!.code!;
      const pasted = convert(code);
      expect(pasted.easing.kind).toBe("linear");
      expect(previewDuration(pasted.easing)).toBeGreaterThan(0);
    }
});

it("handles whitespace, Animation prefix and trailing semicolon without evaluating expressions", () => {
  expect(
    convert("  Animation.timingCurve( .42, 0, .58, 1, duration: 8e-1 ); ")
      .format,
  ).toBe("SwiftUI timing curve");
  for (const input of [
    ".timingCurve(0.42, 0, 0.58, 1, duration: -1)",
    ".timingCurve(0.42, 0, 0.58, 1, duration: 61)",
    ".timingCurve(0.42, 0, 0.58, 1, duration: NaN)",
    ".timingCurve(0.42, 0, 0.58, 1, duration: process.exit())",
    ".timingCurve(1.2, 0, 0.58, 1, duration: 0.5)",
    "{ ease: (() => process.exit())() }",
    "x".repeat(200001),
  ])
    expect(() => convert(input)).toThrow();
});
