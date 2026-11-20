import { expect, it } from "vitest";
import { convert, retimeConversion } from "./convert.ts";
import { fromDuration, physical } from "./model.ts";
import { readFileSync } from "node:fs";

it.each([
  [2, -3],
  [0, 5],
  [-4, 0],
  [2, 2],
])(
  "discloses both velocity aliases (%s, %s) without rejecting them",
  (velocity, initialVelocity) => {
    const value = convert(
      `{stiffness:100,damping:10,velocity:${velocity},initialVelocity:${initialVelocity}}`,
    );
    expect(value.easing).toMatchObject({
      kind: "spring",
      initialVelocity: velocity,
    });
    const reason = `Both velocity and initialVelocity were supplied: velocity (${velocity}) takes precedence; initialVelocity (${initialVelocity}) was discarded.`;
    expect(value.inputLosses).toEqual([reason]);
    expect(value.notes).toContain(reason);
    const baseline = convert(`{stiffness:100,damping:10,velocity:${velocity}}`);
    for (const result of [value, retimeConversion(value, 0.8)]) {
      for (const output of result.outputs) {
        expect(output.note).toContain(reason);
        expect(output.fidelity).toBe(
          output.code === undefined ? "Unavailable" : "Lossy",
        );
      }
    }
    expect(value.outputs.map((output) => output.code)).toEqual(
      baseline.outputs.map((output) => output.code),
    );
  },
);

it.each(["velocity", "initialVelocity"])(
  "does not introduce input loss for a single %s alias",
  (alias) => {
    const value = convert(`{stiffness:100,damping:10,${alias}:2}`);
    expect(value.inputLosses).toBeUndefined();
    expect(value.easing).toMatchObject({ initialVelocity: 2 });
    expect(
      value.outputs.find((output) => output.id === "motion")?.fidelity,
    ).toBe("Exact");
  },
);

it("keeps time-based velocity semantics and discloses both aliases", () => {
  const value = convert(
    "{duration:0.5,bounce:0.3,velocity:2,initialVelocity:4}",
  );
  expect(value.easing).toMatchObject({ initialVelocity: 0 });
  expect(value.notes).toContain(
    "Motion time-based springs ignore initial velocity.",
  );
  expect(value.outputs.find((output) => output.id === "motion")).toMatchObject({
    fidelity: "Lossy",
  });
  expect(
    value.outputs.find((output) => output.id === "motion")?.note,
  ).toContain("initialVelocity (4) was discarded");
  expect(
    value.outputs.find((output) => output.id === "motion")?.note,
  ).toContain("Motion time-based springs ignore initial velocity.");
});

it.each([-1, -1.01, -2])(
  "rejects Apple bounce %s instead of producing invalid native animation",
  (bounce) => {
    expect(() => convert(`.spring(duration:0.5,bounce:${bounce})`)).toThrow(
      /greater than -1|Bounce/,
    );
  },
);
it("maps Apple's negative bounce to damping ratio independently of round trips", () => {
  // Confirmed by executable Apple oracle in scripts/verify-apple-response.ts.
  expect(fromDuration(0.5, -0.5).zeta).toBe(2);
  const swift = convert("{mass:1,stiffness:100,damping:40}").outputs.find(
    (o) => o.id === "swiftui",
  )!;
  expect(swift.code).toContain("bounce: -0.5");
  expect(swift.fidelity).toBe("Exact");
});
it("retains physical mass for SwiftUI when starting from rest", () => {
  const swift = convert("{mass:2,stiffness:200,damping:20}").outputs.find(
    (o) => o.id === "swiftui",
  )!;
  expect(swift.code).toContain(".interpolatingSpring(mass: 2");
  const parsed = convert(swift.code!).easing;
  if (parsed.kind !== "spring") throw new Error("Expected spring");
  expect(physical(parsed)).toEqual({
    mass: 2,
    stiffness: 200,
    damping: 20,
    velocity: 0,
  });
  expect(convert(swift.code!).notes).toEqual([]);
});
it.each([
  "{mass:2,stiffness:200,damping:80}",
  "{mass:1,stiffness:100,damping:40,velocity:2}",
])("does not claim exact native overdamped physical export for %s", (input) => {
  expect(convert(input).outputs.find((o) => o.id === "swiftui")).toMatchObject({
    fidelity: "Unavailable",
    code: undefined,
  });
});
it("reports null DTCG duration as a validation error, not a TypeError", () => {
  const input = JSON.stringify({
    easing: { $type: "cubicBezier", $value: [0, 0, 1, 1] },
    duration: null,
  });
  expect(() => convert(input)).toThrow("DTCG duration needs");
});
it("UI duration edit requests the newly converted easing rather than its stale closure", () => {
  // Wiring guard: unit-level conversion tests alone did not catch this UI bug.
  const source = readFileSync("src/convert-easing.tsx", "utf8");
  const handler = source.slice(
    source.indexOf("function applyDuration()"),
    source.indexOf("const durationActions"),
  );
  expect(handler).not.toMatch(/setRequest\(\{\s*easing,\s*duration: seconds/);
  expect(handler).toMatch(/easing: next\.easing,\s*duration: seconds/);
});
