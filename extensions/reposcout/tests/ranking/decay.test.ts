import { describe, expect, it } from "vitest";
import { ONE_DAY_MS, recencyScore, saturationScore } from "../../src/ranking/decay";

describe("recencyScore", () => {
  const now = 1_000_000_000_000;

  it("scores 0 for a null timestamp", () => {
    expect(recencyScore(null, now, ONE_DAY_MS)).toBe(0);
  });

  it("scores 1 for the present or future", () => {
    expect(recencyScore(now, now, ONE_DAY_MS)).toBe(1);
    expect(recencyScore(now + 1000, now, ONE_DAY_MS)).toBe(1);
  });

  it("halves the score after one half-life", () => {
    expect(recencyScore(now - ONE_DAY_MS, now, ONE_DAY_MS)).toBeCloseTo(0.5, 5);
  });

  it("decays monotonically with age", () => {
    const recent = recencyScore(now - ONE_DAY_MS, now, 7 * ONE_DAY_MS);
    const old = recencyScore(now - 30 * ONE_DAY_MS, now, 7 * ONE_DAY_MS);
    expect(recent).toBeGreaterThan(old);
  });

  it("scores 0 for a non-positive half-life", () => {
    expect(recencyScore(now, now, 0)).toBe(0);
  });
});

describe("saturationScore", () => {
  it("scores 0 for zero or negative counts", () => {
    expect(saturationScore(0, 5)).toBe(0);
    expect(saturationScore(-3, 5)).toBe(0);
  });

  it("scores 0.5 at the half-saturation constant", () => {
    expect(saturationScore(5, 5)).toBeCloseTo(0.5, 5);
  });

  it("increases with count but stays below 1", () => {
    const a = saturationScore(3, 5);
    const b = saturationScore(50, 5);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(1);
  });
});
