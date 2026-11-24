import { describe, expect, it } from "vitest";
import { convert, retimeConversion } from "./convert.ts";
import { curveValue, springValue } from "./model.ts";

const curves = [
  "0.42,0,0.58,1",
  "0,0,1,1",
  "0.34,1.56,0.64,1",
  "linear(0,0.3 25%,1)",
  "linear(0 0%,0 50%,1 50%,1 100%)",
  "linear(0 -20%,0.5 70%,1 120%)",
  "linear(0.2,1.3)",
  "steps(4,jump-start)",
  "steps(4,jump-end)",
  "steps(4,jump-none)",
  "steps(4,jump-both)",
];
const destinations = [
  "figma",
  "figma-css",
  "css-bezier",
  "css-linear",
  "motion",
  "swiftui",
  "compose",
  "tailwind",
  "dtcg",
];

describe("declarative and generated program round trips", () => {
  for (const input of curves)
    for (const duration of [undefined, 0, 0.001, 0.8, 10])
      for (const id of destinations) {
        it(`${input} / ${duration ?? "default"}s / ${id}`, () => {
          const source = convert(input, duration);
          const output = source.outputs.find((o) => o.id === id);
          if (!output) {
            expect(id).toBe("figma-css");
            expect(source.easing.kind).not.toBe("bezier");
            return;
          }
          if (output.code === undefined) {
            expect(output.fidelity).toBe("Unavailable");
            expect(output.note.length).toBeGreaterThan(0);
            return;
          }
          if (id === "dtcg" && source.easing.kind !== "bezier") {
            expect(output.fidelity).toBe("Lossy");
            expect(() => convert(output.code!)).toThrow("cannot reconstruct");
            return;
          }
          const pasted = convert(output.code);
          if (
            source.easing.kind === "spring" ||
            pasted.easing.kind === "spring"
          )
            throw new Error("Unexpected spring");
          for (let i = 0; i <= 100; i++) {
            const expected = curveValue(source.easing, i / 100);
            const actual = curveValue(pasted.easing, i / 100);
            expect(Math.abs(actual - expected)).toBeLessThan(
              output.fidelity === "Sampled" ? 0.001 : 1e-8,
            );
          }
          if (duration !== undefined && !["figma", "figma-css"].includes(id))
            expect(pasted.easing.duration).toBe(duration);
        });
      }
});

describe("physical spring import/export", () => {
  for (const input of [
    ".spring(duration:0.5,bounce:0.6)",
    ".spring(duration:0.5,bounce:1)",
    ".spring(duration:0.5,bounce:-0.5)",
    "{mass:2,stiffness:200,damping:20,velocity:3}",
    "{mass:1000000,stiffness:0.001,damping:0}",
  ])
    for (const period of [undefined, 0.001, 10])
      for (const id of ["figma", "motion", "swiftui", "compose"]) {
        it(`${input} / period ${period ?? "original"} / ${id}`, () => {
          let source = convert(input);
          if (period !== undefined) source = retimeConversion(source, period);
          const output = source.outputs.find((o) => o.id === id)!;
          const result = convert(output.code!);
          if (
            source.easing.kind !== "spring" ||
            result.easing.kind !== "spring"
          )
            throw new Error("Expected spring");
          expect(result.easing.omega0 / source.easing.omega0).toBeCloseTo(
            1,
            10,
          );
          expect(result.easing.zeta).toBeCloseTo(source.easing.zeta, 10);
          if (id === "compose" && source.easing.initialVelocity !== 0) {
            expect(output.fidelity).toBe("Lossy");
            expect(result.easing.initialVelocity).toBe(0);
          } else
            for (const t of [0, 0.001, 0.1, 1])
              expect(springValue(result.easing, t)).toBeCloseTo(
                springValue(source.easing, t),
                6,
              );
        });
      }
});

it("rejects altered generated functions instead of trusting embedded data", () => {
  const outputs = convert("linear(0,0.2 30%,1)").outputs;
  for (const id of ["motion", "swiftui", "compose"]) {
    const code = outputs.find((o) => o.id === id)!.code!;
    expect(() => convert(code + "\nprocess.exit()")).toThrow();
    expect(() => convert(code.replace("0.2", "NaN"))).toThrow();
  }
});
