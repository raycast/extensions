import { describe, expect, it } from "vitest";
import type { HelperStatus } from "../helper";
import {
  acknowledged,
  baselineLost,
  computeNext,
  normalize,
  parseExternalMax,
  parseIntent,
  parseLowBattery,
  parseStrategy,
  resolveOperation,
  resolveToggle,
} from "../intent";

const LOW = 1.1875;
const MEDIUM = 1.375;
const HIGH = 1.5625;
const MAX = 1.75;

describe("computeNext: one complete snapshot per operation, from the SAVED intent", () => {
  it("All Displays resets every per-display level", () => {
    expect(computeNext({ kind: "all", level: HIGH }, { all: 1, levels: { XDR: LOW } }, ["BI"]).intent).toEqual({
      all: HIGH,
      levels: {},
    });
  });

  it("a per-display change keeps every other display, connected or unplugged", () => {
    const saved = { all: MEDIUM, levels: { XDR: LOW } }; // XDR unplugged
    expect(computeNext({ kind: "displays", levels: { BI: HIGH } }, saved, ["BI"]).intent).toEqual({
      all: MEDIUM,
      levels: { XDR: LOW, BI: HIGH },
    });
  });

  it("F15: with the helper stopped, setting one display keeps the others' saved levels (restored on start)", () => {
    const saved = { all: HIGH, levels: {} }; // both displays saved at High, helper stopped
    expect(computeNext({ kind: "displays", levels: { BI: LOW } }, saved, ["BI", "XDR"]).intent).toEqual({
      all: HIGH,
      levels: { BI: LOW },
    });
  });

  it("F14: Increase at Max sends explicit Max for connected displays and keeps an unplugged display's level", () => {
    const saved = { all: 1, levels: { BI: MAX, XDR: LOW } }; // XDR unplugged at Low
    const next = computeNext({ kind: "step", direction: 1 }, saved, ["BI"]);
    expect(next.intent).toEqual({ all: 1, levels: { BI: MAX, XDR: LOW } });
    expect(next.saturated).toBe(true);
  });

  it("Increase steps each connected display from its own level, as explicit levels", () => {
    const next = computeNext({ kind: "step", direction: 1 }, { all: 1, levels: { XDR: HIGH } }, ["BI", "XDR"]);
    expect(next.intent).toEqual({ all: 1, levels: { BI: LOW, XDR: MAX } });
    expect(next.saturated).toBe(false);
  });

  it("Decrease at Off touches connected displays only: an unplugged display keeps its boost", () => {
    const saved = { all: 1, levels: { XDR: HIGH } }; // XDR unplugged, built-in off
    const next = computeNext({ kind: "step", direction: -1 }, saved, ["BI"]);
    expect(next.intent).toEqual({ all: 1, levels: { BI: 1, XDR: HIGH } });
    expect(next.saturated).toBe(true);
  });

  it("Toggle: anything connected boosted → everything off; otherwise All Displays → default", () => {
    expect(computeNext({ kind: "toggle", level: HIGH }, { all: 1, levels: { XDR: LOW } }, ["XDR"]).intent).toEqual({
      all: 1,
      levels: {},
    });
    expect(computeNext({ kind: "toggle", level: HIGH }, { all: 1, levels: {} }, ["XDR"]).intent).toEqual({
      all: HIGH,
      levels: {},
    });
  });

  it("toggling one display flips only that display", () => {
    const saved = { all: MEDIUM, levels: {} };
    expect(computeNext({ kind: "toggleDisplay", uuid: "BI", level: HIGH }, saved, ["BI", "XDR"]).intent).toEqual({
      all: MEDIUM,
      levels: { BI: 1 },
    });
  });

  it("F17: decisions come from the saved intent, never from a stopped helper's Off rows", () => {
    // Saved: both Medium. Setting only BI Off must keep XDR Medium, whatever the helper reported.
    expect(
      computeNext({ kind: "displays", levels: { BI: 1 } }, { all: MEDIUM, levels: {} }, ["BI", "XDR"]).intent,
    ).toEqual({ all: MEDIUM, levels: { BI: 1 } });
  });
});

describe("normalize: off everywhere is All Displays → Off", () => {
  it("every connected display off and nothing unplugged boosted", () => {
    expect(normalize({ all: HIGH, levels: { BI: 1, XDR: 1 } }, ["BI", "XDR"])).toEqual({ all: 1, levels: {} });
  });
  it("not while an unplugged display keeps a boost", () => {
    const intent = { all: 1, levels: { BI: 1, XDR: HIGH } };
    expect(normalize(intent, ["BI"])).toEqual(intent);
  });
  it("not with no displays connected (would be vacuously true)", () => {
    const intent = { all: HIGH, levels: {} };
    expect(normalize(intent, [])).toEqual(intent);
  });
});

describe("acknowledged: the helper reports back the COMPLETE snapshot", () => {
  const status = (running: boolean, all: number, levels: Record<string, number>): HelperStatus => ({
    running,
    allLevel: all,
    levels,
    externalMax: 2,
    strategy: "adaptive",
    lowBattery: 20,
    displays: [],
  });
  it("matches all and every per-display level, unplugged ones included", () => {
    const intent = { all: 1, levels: { XDR: HIGH } };
    expect(
      acknowledged(status(true, 1, { XDR: HIGH }), intent, { strategy: "adaptive", externalMax: 2, lowBattery: 20 }),
    ).toBe(true);
    expect(acknowledged(status(true, 1, {}), intent, { strategy: "adaptive", externalMax: 2, lowBattery: 20 })).toBe(
      false,
    );
    expect(
      acknowledged(status(true, 1, { XDR: HIGH, BI: LOW }), intent, {
        strategy: "adaptive",
        externalMax: 2,
        lowBattery: 20,
      }),
    ).toBe(false);
  });
  it("a snapshot that boosts nothing is acknowledged by the helper having quit", () => {
    expect(
      acknowledged(
        status(false, 1, {}),
        { all: 1, levels: {} },
        { strategy: "adaptive", externalMax: 2, lowBattery: 20 },
      ),
    ).toBe(true);
    expect(
      acknowledged(
        status(true, 1, {}),
        { all: 1, levels: {} },
        { strategy: "adaptive", externalMax: 2, lowBattery: 20 },
      ),
    ).toBe(false);
  });
});

describe("parseIntent: stored intent is validated", () => {
  it("drops non-numbers and clamps", () => {
    expect(parseIntent({ all: 9, levels: { A: "x", B: 0.5, C: 1.5 } })).toEqual({
      all: 1.75,
      levels: { B: 1, C: 1.5 },
    });
    expect(parseIntent({ all: "1" })).toBeUndefined();
    expect(parseIntent(null)).toBeUndefined();
  });
});

describe("G1: restore applies the saved intent exactly, never normalized", () => {
  it("keeps All Displays High while the display it covers is unplugged", () => {
    const saved = { all: 1.5625, levels: { BI: 1 } }; // XDR unplugged, covered by All Displays
    expect(computeNext({ kind: "restore" }, saved, ["BI"]).intent).toEqual(saved);
  });
});

describe("G2: toggles decide from what the displays are doing now", () => {
  const live = (running: boolean, levels: Record<string, number>) => ({
    running,
    displays: Object.entries(levels).map(([uuid, level]) => ({ uuid, level })),
  });
  it("helper stopped with High saved: Toggle turns it ON, as the label says", () => {
    expect(resolveToggle({ kind: "toggle", level: 1.5625 }, live(false, { BI: 1, XDR: 1 }))).toEqual({
      kind: "all",
      level: 1.5625,
    });
  });
  it("anything boosted now: Toggle turns everything off", () => {
    expect(resolveToggle({ kind: "toggle", level: 1.5625 }, live(true, { BI: 1, XDR: 1.375 }))).toEqual({
      kind: "all",
      level: 1,
    });
  });
  it("one display: flips that display from its live level", () => {
    expect(
      resolveToggle({ kind: "toggleDisplay", uuid: "BI", level: 1.5625 }, live(true, { BI: 1.375, XDR: 1 })),
    ).toEqual({
      kind: "displays",
      levels: { BI: 1 },
    });
  });
});

describe("G4/G3: an outdated (stale) helper being replaced", () => {
  const stoppedReadBack = { running: false, displays: [{ uuid: "BI", level: 1 }] };
  it("G4: Toggle with saved High turns OFF (decided from saved intent, not the stopped read-back)", () => {
    const op = resolveOperation({ kind: "toggle", level: 1.5625 }, stoppedReadBack, true, true);
    expect(computeNext(op, { all: 1.5625, levels: {} }, ["BI"]).intent).toEqual({ all: 1, levels: {} });
  });
  it("G4/G5: Toggle with nothing saved falls back to OFF (direction unknowable; disclosed)", () => {
    expect(resolveOperation({ kind: "toggle", level: 1.5625 }, stoppedReadBack, true, false)).toEqual({
      kind: "all",
      level: 1,
    });
  });
  it("G3/G5: every invoked operation but an explicit All level reports a lost baseline, judged before resolution", () => {
    expect(baselineLost({ kind: "step", direction: 1 }, true, false)).toBe("change");
    expect(baselineLost({ kind: "displays", levels: { BI: 1.5 } }, true, false)).toBe("change");
    expect(baselineLost({ kind: "restore" }, true, false)).toBe("restore");
    expect(baselineLost({ kind: "toggle", level: 1.5 }, true, false)).toBe("toggle");
    expect(baselineLost({ kind: "toggleDisplay", uuid: "BI", level: 1.5 }, true, false)).toBe("toggle");
    expect(baselineLost({ kind: "all", level: 1.5 }, true, false)).toBe("none");
    expect(baselineLost({ kind: "step", direction: 1 }, true, true)).toBe("none");
    expect(baselineLost({ kind: "step", direction: 1 }, false, false)).toBe("none");
  });
});

describe("Boost tuning (strategy + External XDR Maximum)", () => {
  it("parses the light-gain maximum, defaulting conservatively to 2×", () => {
    expect(parseExternalMax("1.5")).toBe(1.5);
    expect(parseExternalMax("3.42")).toBe(3.42);
    expect(parseExternalMax("9")).toBeCloseTo(Math.pow(1.75, 2.2));
    expect(parseExternalMax(undefined)).toBe(2);
    expect(parseExternalMax("bogus")).toBe(2);
    expect(parseExternalMax("1")).toBe(2);
  });
  it("parses the battery threshold, defaulting to 20%", () => {
    expect(parseLowBattery("0")).toBe(0);
    expect(parseLowBattery("50")).toBe(50);
    expect(parseLowBattery(undefined)).toBe(20);
    expect(parseLowBattery("bogus")).toBe(20);
  });
  it("parses the strategy, defaulting to adaptive", () => {
    expect(parseStrategy("fixed")).toBe("fixed");
    expect(parseStrategy("adaptive")).toBe("adaptive");
    expect(parseStrategy(undefined)).toBe("adaptive");
  });
  it("acknowledges only when the helper runs with the same strategy and ceiling", () => {
    const s = (externalMax: number | null, strategy: "adaptive" | "fixed" | null) => ({
      running: true,
      allLevel: 1.5625,
      levels: {},
      externalMax,
      strategy,
      lowBattery: 20,
      displays: [],
    });
    const intent = { all: 1.5625, levels: {} };
    expect(acknowledged(s(2, "adaptive"), intent, { strategy: "adaptive", externalMax: 2, lowBattery: 20 })).toBe(true);
    expect(acknowledged(s(2, "fixed"), intent, { strategy: "adaptive", externalMax: 2, lowBattery: 20 })).toBe(false);
    expect(acknowledged(s(3, "adaptive"), intent, { strategy: "adaptive", externalMax: 2, lowBattery: 20 })).toBe(
      false,
    );
    expect(acknowledged(s(null, null), intent, { strategy: "adaptive", externalMax: 2, lowBattery: 20 })).toBe(false);
  });
});
