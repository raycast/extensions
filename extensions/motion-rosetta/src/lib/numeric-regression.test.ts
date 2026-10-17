import { expect, it } from "vitest";
import { convert, retimeConversion } from "./convert.ts";
import { formatNumber, physical } from "./model.ts";
import { durationSeconds } from "./user-settings.ts";
import { InputActivation } from "./input-activation.ts";

it("preserves small positive Compose stiffness instead of rounding to zero", () => {
  const result = convert("{mass:1000000,stiffness:0.001,damping:0}");
  const output = result.outputs.find((o) => o.id === "compose")!;
  const stiffness = Number(output.code!.match(/stiffness = ([^\s]+)f/)![1]);
  expect(stiffness).toBeGreaterThan(0);
  expect(stiffness).toBeCloseTo(1e-9, 20);
  expect(output.fidelity).toBe("Exact");
});

it("round-trips numeric magnitudes and does not merge nearby linear stops", () => {
  for (const number of [0, -0, 1e-12, -1e-12, 0.999999999, 1e20, Math.PI])
    expect(Number(formatNumber(number))).toBe(number === 0 ? 0 : number);
  for (const number of [NaN, Infinity, -Infinity])
    expect(() => formatNumber(number)).toThrow();
  const output = convert("linear(0 0%, 0.5 0.00001%, 1 100%)").outputs.find(
    (o) => o.id === "motion",
  )!;
  expect(output.code).toContain("1e-7");
});

it.each(["1", "5", "10", "500", "10000"])(
  "edits spring period to %s ms canonically, including extreme masses",
  (milliseconds) => {
    for (const input of [
      ".spring(duration: 0.5, bounce: 0.15)",
      "{mass:1000000,stiffness:0.001,damping:1000000,velocity:3}",
      "{mass:0.001,stiffness:1000000,damping:0,velocity:-4}",
    ]) {
      const original = convert(input);
      if (original.easing.kind !== "spring") throw new Error("Expected spring");
      const before = structuredClone(original);
      const seconds = durationSeconds(milliseconds);
      const edited = retimeConversion(original, seconds);
      expect(edited.easing).toEqual({
        ...original.easing,
        omega0: (2 * Math.PI) / seconds,
      });
      expect(original).toEqual(before);
      const parameters = physical(edited.easing);
      expect(parameters.stiffness).toBeGreaterThan(0);
      expect(Number.isFinite(parameters.damping)).toBe(true);
      expect(
        edited.outputs.every((o) => !/NaN|Infinity/.test(o.code || "")),
      ).toBe(true);
      const repeated = retimeConversion(edited, 0.8);
      expect(
        repeated.notes.filter((n) => n.startsWith("Edited spring period:")),
      ).toHaveLength(1);
      const activation = new InputActivation();
      activation.accept(input, true);
      expect(activation.accept(input, true).duplicate).toBe(true);
      expect(activation.accept("ease-out", true).duplicate).toBe(false);
    }
  },
);

it("keeps external parser limits and rejects invalid canonical duration edits", () => {
  expect(() => convert("{stiffness:1e16}")).toThrow();
  const source = convert(".spring(duration: 0.5, bounce: 0.15)");
  for (const seconds of [0, -1, 0.0001, 10.001, NaN, Infinity])
    expect(() => retimeConversion(source, seconds)).toThrow();
  expect(() => retimeConversion(convert("ease-out"), 0.5)).toThrow();
});
