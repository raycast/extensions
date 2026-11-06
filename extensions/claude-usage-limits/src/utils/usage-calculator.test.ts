import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { SessionData } from "../types/usage-types";
import { calculateModelUsage, calculateMonthlyProjection } from "./usage-calculator";

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

describe("calculateModelUsage", () => {
  it("credits each model in a session with its own usage", () => {
    const breakdown = (modelName: string, cost: number) => ({
      modelName,
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      cost,
    });
    const session = {
      modelBreakdowns: [breakdown("sonnet", 1), breakdown("opus", 5)],
      modelsUsed: ["sonnet", "opus"],
      inputTokens: 20,
      outputTokens: 40,
      totalTokens: 60,
      totalCost: 6,
    } as unknown as SessionData;
    const usage = calculateModelUsage([session]);
    expect(usage.map((model) => [model.model, model.totalCost, model.sessionCount]).sort()).toEqual([
      ["opus", 5, 1],
      ["sonnet", 1, 1],
    ]);
  });
});
