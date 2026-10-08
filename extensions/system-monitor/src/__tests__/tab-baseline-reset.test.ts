import { describe, expect, it } from "vitest";

import { resetPerCoreCpuBaseline, getPerCoreCpuUsage } from "../lib/cpu-stats";
import { resetCpuTabBaselines } from "../lib/tab-baseline-reset";

describe("tab baseline resets", () => {
  it("clears CPU per-core baselines", () => {
    getPerCoreCpuUsage();
    resetCpuTabBaselines();

    const sample = getPerCoreCpuUsage();
    expect(sample.hasPreviousSample).toBe(false);
  });

  it("exports dedicated reset helpers for inactive tabs", () => {
    resetPerCoreCpuBaseline();
    expect(getPerCoreCpuUsage().hasPreviousSample).toBe(false);
  });
});
