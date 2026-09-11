import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { calculateMonthlyProjection } from "./usage-calculator";

describe("calculateMonthlyProjection", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("extrapolates monthly cost from daily average", () => {
    jest.setSystemTime(new Date(2025, 1, 15)); // Feb 15 (28-day month)

    const result = calculateMonthlyProjection(150);

    expect(result.dailyAverage).toBeCloseTo(10);
    expect(result.projectedMonthlyCost).toBeCloseTo(280);
  });

  it("returns actual spend at end of month", () => {
    jest.setSystemTime(new Date(2025, 4, 31)); // May 31 (31-day month)

    const result = calculateMonthlyProjection(310);

    expect(result.dailyAverage).toBeCloseTo(10);
    expect(result.projectedMonthlyCost).toBeCloseTo(310);
  });

  it("projects from a single day of data", () => {
    jest.setSystemTime(new Date(2025, 0, 1)); // Jan 1 (31-day month)

    const result = calculateMonthlyProjection(5);

    expect(result.dailyAverage).toBeCloseTo(5);
    expect(result.projectedMonthlyCost).toBeCloseTo(155);
  });
});
