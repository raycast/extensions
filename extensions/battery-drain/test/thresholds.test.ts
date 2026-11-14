import { describe, expect, it } from "vitest";
import { detectRunaways } from "../src/analysis/runaway";
import { THRESHOLDS, thresholdsFrom } from "../src/analysis/thresholds";
import { Sample, Snapshot } from "../src/types";

describe("thresholdsFrom", () => {
  it("uses the defaults when nothing is set", () => {
    expect(thresholdsFrom({})).toEqual(THRESHOLDS);
  });

  it("applies valid preferences", () => {
    const th = thresholdsFrom({ runawayCpu: "60", runawayMinutes: "5", highWatts: "18.5" });
    expect(th.runawayCpu).toBe(60);
    expect(th.runawayMinSec).toBe(300);
    expect(th.highWatts).toBe(18.5);
    expect(th.maxGapMs).toBe(THRESHOLDS.maxGapMs);
  });

  it.each([["1"], ["0.01"], ["0x10"], ["1e2"]])("rejects the implausible or oddly written value %j", (value) => {
    const th = thresholdsFrom({ runawayCpu: value, runawayMinutes: value });
    expect(th.runawayCpu).toBe(THRESHOLDS.runawayCpu);
    if (value !== "1") expect(th.runawayMinSec).toBe(THRESHOLDS.runawayMinSec);
  });

  it.each([["0"], ["-5"], ["abc"], [""], ["500"]])("falls back to the default for %j", (value) => {
    const th = thresholdsFrom({ runawayCpu: value, runawayMinutes: value, highWatts: value === "500" ? "0" : value });
    expect(th.runawayCpu).toBe(THRESHOLDS.runawayCpu);
    expect(th.highWatts).toBe(THRESHOLDS.highWatts);
    if (value !== "500") expect(th.runawayMinSec).toBe(THRESHOLDS.runawayMinSec);
  });
});

describe("custom thresholds reach the analysis", () => {
  it("flags a two-minute streak when runaway minutes is 1", () => {
    const MIN = 60_000;
    const history: Sample[] = [0, 1].map((m) => ({
      t: m * MIN,
      procs: [{ pid: 42, cmd: "yes", cpu: 99, energy: 99 }],
    }));
    const snap: Snapshot = {
      t: 2 * MIN,
      battery: {},
      processes: [{ pid: 42, command: "yes", cpu: 99, energy: 99 }],
      processInfo: new Map(),
      blockers: [],
      errors: [],
    };
    expect(detectRunaways(history, snap)).toEqual([]);
    const th = thresholdsFrom({ runawayMinutes: "1" });
    expect(detectRunaways(history, snap, th)).toEqual([{ pid: 42, command: "yes", cpu: 99, sinceSec: 120 }]);
  });
});
