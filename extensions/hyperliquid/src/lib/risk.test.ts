import { describe, expect, it } from "vitest";

import {
  DEFAULT_RISK_THRESHOLDS,
  getAccountRisk,
  getPositionRisk,
  riskBadge,
  thresholdsFromPercent,
  worstLevel,
} from "./risk";

describe("risk helpers", () => {
  it("computes fractional distance to liquidation for both sides", () => {
    expect(getPositionRisk(100, 90).distanceToLiq).toBeCloseTo(0.1);
    expect(getPositionRisk(100, 110).distanceToLiq).toBeCloseTo(0.1);
  });

  it("buckets position risk by threshold", () => {
    expect(getPositionRisk(100, 97).level).toBe("danger");
    expect(getPositionRisk(100, 90).level).toBe("warning");
    expect(getPositionRisk(100, 50).level).toBe("safe");
  });

  it("treats missing liquidation price as safe", () => {
    expect(getPositionRisk(100, null)).toEqual({ distanceToLiq: null, level: "safe" });
  });

  it("computes account maintenance-margin headroom", () => {
    expect(getAccountRisk(1000, 100).marginRatio).toBeCloseTo(0.9);
    expect(getAccountRisk(1000, 970).level).toBe("danger");
    expect(getAccountRisk(1000, 880).level).toBe("warning");
    expect(getAccountRisk(0, 0)).toEqual({ marginRatio: null, level: "safe" });
  });

  it("picks the most severe level and badge", () => {
    expect(worstLevel(["safe", "warning", "danger"])).toBe("danger");
    expect(worstLevel(["safe", "warning"])).toBe("warning");
    expect(worstLevel(["safe", "safe"])).toBe("safe");
    expect(riskBadge("danger")).toBe("🔴");
  });

  it("builds thresholds from a danger percentage", () => {
    const built = thresholdsFromPercent(5);
    expect(built.danger).toBeCloseTo(0.05);
    expect(built.warning).toBeCloseTo(0.15);
    expect(thresholdsFromPercent(undefined)).toBe(DEFAULT_RISK_THRESHOLDS);
    expect(thresholdsFromPercent(0)).toBe(DEFAULT_RISK_THRESHOLDS);
    expect(thresholdsFromPercent(40).warning).toBe(0.9);
  });
});
