import { describe, expect, it } from "vitest";
import { spring } from "motion";
import { convert } from "./convert.ts";
import {
  curveValue,
  crossings,
  fromDuration,
  physical,
  springValue,
  springWindow,
  type Spring,
} from "./model.ts";
import { graphSVG, graphMarkdown } from "./graph.ts";
import { parse } from "./parse.ts";

describe("acceptance and fidelity", () => {
  it.each([
    "0.42, 0, 0.58, 1",
    "cubic-bezier(0.42, 0, 0.58, 1)",
    "[0.42, 0, 0.58, 1]",
  ])("converts %s to SwiftUI", (input) => {
    expect(convert(input).outputs.find((o) => o.id === "swiftui")?.code).toBe(
      ".timingCurve(0.42, 0, 0.58, 1, duration: 0.5)",
    );
  });
  it("matches Apple's verified spring fixture", () => {
    const p = physical(fromDuration(0.5, 0.3));
    expect(p.stiffness).toBeCloseTo(157.91367, 4);
    expect(p.damping).toBeCloseTo(17.59292, 4);
  });
  it("counts bounce 0.6 crossings and refuses Bézier", () => {
    const result = convert(".spring(duration: 0.5, bounce: 0.6)");
    const s = result.easing as Spring;
    expect(crossings(s, springWindow(s).seconds)).toBeGreaterThanOrEqual(2);
    expect(result.outputs.find((o) => o.id === "css-bezier")).toMatchObject({
      fidelity: "Unavailable",
      code: undefined,
    });
    expect(result.outputs.find((o) => o.id === "css-linear")?.code).toContain(
      "linear(",
    );
    expect(result.outputs.find((o) => o.id === "figma-motion")?.note).toContain(
      "ω₀",
    );
    expect(
      JSON.parse(result.outputs.find((o) => o.id === "dtcg")!.code!).duration
        .$type,
    ).toBe("duration");
  });
  it("normalizes Compose mass and declares initial velocity loss", () => {
    const result = convert(
      '{ type: "spring", stiffness: 200, damping: 20, mass: 2, velocity: 3 }',
    );
    expect(result.outputs.find((o) => o.id === "compose")?.code).toContain(
      "stiffness = 100f",
    );
    expect(result.outputs.find((o) => o.id === "compose")?.fidelity).toBe(
      "Lossy",
    );
    expect(result.outputs.find((o) => o.id === "motion")?.code).toContain(
      "velocity: 3",
    );
  });
  it("applies the 1.2 visual-duration conversion", () => {
    const s = parse('{type: "spring", visualDuration: 0.5, bounce: 0.6}')
      .easing as Spring;
    expect((2 * Math.PI) / s.omega0).toBeCloseTo(0.6, 8);
  });
  it("keeps undamped springs finite for display and marks truncation", () => {
    const s = fromDuration(0.5, 1);
    expect(springWindow(s).truncated).toBe(true);
    expect(Number.isFinite(springValue(s, 10))).toBe(true);
    expect(
      convert(".spring(duration: 0.5, bounce: 1)").outputs.find(
        (o) => o.id === "css-linear",
      )?.note,
    ).toContain("not settled");
  });
});

describe("CSS parsing", () => {
  it("distributes omitted positions, expands dual positions and preserves jumps", () => {
    const e = parse("linear(0, 0.3, 0.6 50% 75%, 1)").easing;
    expect(e).toEqual({
      kind: "linear",
      stops: [
        { x: 0, y: 0 },
        { x: 0.25, y: 0.3 },
        { x: 0.5, y: 0.6 },
        { x: 0.75, y: 0.6 },
        { x: 1, y: 1 },
      ],
    });
    const jumps = parse("linear(0 0%, 0 50%, 1 50%, 1 100%)").easing;
    if (jumps.kind === "spring") throw Error();
    expect(curveValue(jumps, 0.4999)).toBe(0);
    expect(curveValue(jumps, 0.5)).toBe(1);
  });
  it("clamps decreasing CSS stop positions", () => {
    expect(parse("linear(0 50%, 0.5 20%, 1)").easing).toEqual({
      kind: "linear",
      stops: [
        { x: 0.5, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ],
    });
  });
  it.each([
    "cubic-bezier(2, 0, 1, 1)",
    "[0,NaN,1,1]",
    "linear(0)",
    "linear(0, 1 30px)",
    '{type:"spring",stiffness:-1}',
    '{type:"spring",damping:eval(1)}',
    '{type:"spring",unknown:3}',
    "steps(1, jump-none)",
    "{mass:1,mass:2}",
  ])("rejects invalid or executable input: %s", (input) =>
    expect(() => parse(input)).toThrow(),
  );
});

describe("physical response against Motion runtime", () => {
  it.each([0, 0.3, 0.6, 0.95])(
    "matches Motion duration solver at bounce %s",
    (bounce) => {
      const ours = parse(`{ type: "spring", duration: 0.8, bounce: ${bounce} }`)
        .easing as Spring;
      const actual = spring({ keyframes: [0, 1], duration: 800, bounce });
      for (const ms of [10, 70, 150, 330, 550])
        expect(springValue(ours, ms / 1000)).toBeCloseTo(
          actual.next(ms).value,
          5,
        );
    },
  );
  it.each([0.3, 1, 2])(
    "preserves initial velocity for damping ratio %s",
    (zeta) => {
      const ours = {
        kind: "spring" as const,
        omega0: 10,
        zeta,
        mass: 2,
        initialVelocity: 3,
      };
      const p = physical(ours);
      const actual = spring({
        keyframes: [0, 1],
        ...p,
        restDelta: 0.0000001,
        restSpeed: 0.0000001,
      });
      for (const ms of [0, 10, 70, 150, 330])
        expect(springValue(ours, ms / 1000)).toBeCloseTo(
          actual.next(ms).value,
          5,
        );
    },
  );
});

describe("theme-aware bounded graph", () => {
  it("changes palette, preserves geometry and supplies markdown dimensions", () => {
    const e = fromDuration(0.5, 0.6);
    const dark = graphSVG(e, "dark"),
      light = graphSVG(e, "light");
    expect(dark).not.toBe(light);
    expect(dark).toContain("OVERSHOOT");
    expect(dark.match(/d="M[^"]+"/g)).toEqual(light.match(/d="M[^"]+"/g));
    expect(graphMarkdown(e, "dark")).toContain(
      "?raycast-width=340&raycast-height=216",
    );
    expect(dark).not.toMatch(/NaN|Infinity/);
  });
});
