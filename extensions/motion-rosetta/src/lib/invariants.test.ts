import { expect, it } from "vitest";
import { convert } from "./convert.ts";
import { curveValue, springValue } from "./model.ts";
import { graphSVG } from "./graph.ts";

// Fixed seed: failures are reproducible, not a random green test run.
let seed = 20260915;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const bezierCases = Array.from({ length: 64 }, () => [
  random(),
  random() * 4 - 1.5,
  random(),
  random() * 4 - 1.5,
]);
it.each(bezierCases.map((points, index) => ({ points, index })))(
  "seeded Bézier $index retains response in exact destinations",
  ({ points }) => {
    const source = convert(points.join(","), 0.75);
    if (source.easing.kind !== "bezier") throw new Error("Expected Bézier");
    for (const output of source.outputs.filter((o) => o.fidelity === "Exact")) {
      const pasted = convert(output.code!);
      if (pasted.easing.kind !== "bezier") throw new Error("Expected Bézier");
      for (let i = 0; i <= 50; i++)
        expect(curveValue(pasted.easing, i / 50)).toBeCloseTo(
          curveValue(source.easing, i / 50),
          10,
        );
    }
    expect(graphSVG(source.easing, "dark")).not.toMatch(/NaN|Infinity/);
    expect(graphSVG(source.easing, "light")).not.toMatch(/NaN|Infinity/);
  },
);

it.each([0, 0.3, 0.6, 0.95, 1, -0.5])(
  "declares spring losses at bounce %s",
  (bounce) => {
    const source = convert(`.spring(duration:0.5,bounce:${bounce})`);
    expect(source.outputs.find((o) => o.id === "css-bezier")?.fidelity).toBe(
      "Unavailable",
    );
    expect(source.outputs.find((o) => o.id === "css-linear")?.fidelity).toBe(
      "Sampled",
    );
    expect(source.outputs.find((o) => o.id === "dtcg")?.fidelity).toBe("Lossy");
    const figma = source.outputs.find((o) => o.id === "figma-motion")!;
    expect(figma.fidelity).toBe(bounce < 0 ? "Unavailable" : "Lossy");
    const visual = source.outputs.find((o) => o.id === "motion-time")!;
    if (visual.code) {
      const pasted = convert(visual.code);
      if (pasted.easing.kind !== "spring" || source.easing.kind !== "spring")
        throw new Error("Expected spring");
      for (let i = 0; i <= 50; i++)
        expect(springValue(pasted.easing, i / 50)).toBeCloseTo(
          springValue(source.easing, i / 50),
          8,
        );
    } else expect(visual.fidelity).toBe("Unavailable");
  },
);

it("declares fractional-millisecond rounding instead of claiming exact Compose timing", () => {
  const output = convert(
    ".timingCurve(0.42,0,0.58,1,duration:0.0005)",
  ).outputs.find((o) => o.id === "compose")!;
  expect(output.fidelity).toBe("Lossy");
  expect(output.note).toContain("rounded");
  expect(output.code).toContain("durationMillis = 1");
});

it.each([
  "{__proto__:1}",
  "{type:'spring',constructor:1}",
  "{stiffness:Infinity}",
  "{stiffness:NaN}",
  "{damping:-1}",
  "{mass:0}",
  "{mass:1000001}",
  "{stiffness:1e16}",
  "{velocity:()=>1}",
  "{ease:[0,0,1,1],duration:process.exit()}",
  "linear(0 50% 20% 100%,1)",
  "steps(0,end)",
  "steps(513,end)",
  "[0,0,1,1];process.exit()",
  ".timingCurve(0,0,1,1,duration:1/2)",
])("rejects malformed or executable payload %s", (input) => {
  expect(() => convert(input)).toThrow();
});
