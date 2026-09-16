import { expect, it } from "vitest";
import { convert } from "./convert.ts";
import { fromDuration, physical } from "./model.ts";
import { readFileSync } from "node:fs";

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
