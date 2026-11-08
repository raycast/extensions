import { describe, expect, it } from "vitest";
import { computePace, paceSummary } from "../../src/lib/pace";
import { LimitWindow } from "../../src/lib/types";

const WEEK = 10080;
const resetsAt = new Date("2026-11-14T07:00:00Z");
const weekly = (usedPercent: number): LimitWindow => ({
  id: "secondary",
  title: "Weekly",
  usedPercent,
  resetsAt,
  windowMinutes: WEEK,
});
/** 12.4h into the week, as observed against CodexBar's own "Expected 7% used". */
const now = new Date(resetsAt.getTime() - (WEEK * 60_000 - 12.4 * 3_600_000));

describe("computePace", () => {
  it("matches CodexBar's linear expectation", () => {
    const pace = computePace(weekly(2), now);
    expect(pace).toMatchObject({ expectedUsedPercent: 7, deltaPercent: -5, willLastToReset: true });
    expect(paceSummary(pace!)).toBe("5% in reserve");
  });

  it("projects when the quota runs out", () => {
    const pace = computePace(weekly(50), now);
    expect(pace?.willLastToReset).toBe(false);
    expect(paceSummary(pace!)).toBe("43% ahead of pace");
    // 50% in 12.4h -> remaining 50% takes another 12.4h
    expect(pace?.runsOutAt?.getTime()).toBeCloseTo(now.getTime() + 12.4 * 3_600_000, -3);
  });

  it("reports exhausted windows", () => {
    const pace = computePace(weekly(100), now);
    expect(pace).toMatchObject({ willLastToReset: false, runsOutAt: now });
  });

  it("does not extrapolate right after a reset", () => {
    const justReset = new Date(resetsAt.getTime() - WEEK * 60_000 + 60_000);
    expect(computePace(weekly(1), justReset)?.willLastToReset).toBe(true);
  });

  it("needs a window length and a future reset", () => {
    expect(computePace({ ...weekly(10), windowMinutes: undefined }, now)).toBeUndefined();
    expect(computePace({ ...weekly(10), resetsAt: undefined }, now)).toBeUndefined();
    expect(computePace(weekly(10), new Date(resetsAt.getTime() + 1000))).toBeUndefined();
  });

  it("calls an exact match on pace", () => {
    expect(paceSummary({ expectedUsedPercent: 10, deltaPercent: 0, willLastToReset: true })).toBe("On pace");
  });
});
