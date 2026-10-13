import { describe, expect, it } from "vitest";

import { loadPressurePercent } from "../lib/load-average";

describe("loadPressurePercent", () => {
  it("scales load by the core count", () => {
    expect(loadPressurePercent(5, 10)).toBe(50);
    expect(loadPressurePercent(6.63, 10)).toBe(66);
    expect(loadPressurePercent(4, 4)).toBe(100);
  });

  it("caps saturated systems at 100", () => {
    expect(loadPressurePercent(12, 4)).toBe(100);
  });

  it("returns 0 for unusable input", () => {
    expect(loadPressurePercent(-1, 8)).toBe(0);
    expect(loadPressurePercent(Number.NaN, 8)).toBe(0);
    expect(loadPressurePercent(3, 0)).toBe(0);
  });
});
