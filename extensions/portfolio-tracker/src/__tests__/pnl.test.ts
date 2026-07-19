/**
 * Tests for unrealized P&L calculations (utils/pnl.ts).
 */

import { computePnl, computeWeightedAvgCost } from "../utils/pnl";

// ──────────────────────────────────────────
// computePnl
// ──────────────────────────────────────────

describe("computePnl", () => {
  it("computes a loss when the price drops below the average cost", () => {
    // The motivating example: $100 invested in ETH at $4,000 (0.025 units),
    // ETH drops 50% to $2,000 → position is worth $50, a $50 (−50%) loss.
    const result = computePnl(0.025, 4000, 2000);

    expect(result).toBeDefined();
    expect(result!.costBasis).toBeCloseTo(100);
    expect(result!.pnl).toBeCloseTo(-50);
    expect(result!.pnlPercent).toBeCloseTo(-50);
  });

  it("computes a gain when the price rises above the average cost", () => {
    const result = computePnl(10, 100, 150);

    expect(result).toBeDefined();
    expect(result!.costBasis).toBeCloseTo(1000);
    expect(result!.pnl).toBeCloseTo(500);
    expect(result!.pnlPercent).toBeCloseTo(50);
  });

  it("returns zero P&L when the price equals the average cost", () => {
    const result = computePnl(5, 80, 80);

    expect(result).toBeDefined();
    expect(result!.pnl).toBeCloseTo(0);
    expect(result!.pnlPercent).toBeCloseTo(0);
  });

  it("returns undefined when no average cost is recorded", () => {
    expect(computePnl(10, undefined, 100)).toBeUndefined();
  });

  it("returns undefined for non-positive average cost", () => {
    expect(computePnl(10, 0, 100)).toBeUndefined();
    expect(computePnl(10, -5, 100)).toBeUndefined();
  });

  it("returns undefined when the current price is unavailable (zero)", () => {
    expect(computePnl(10, 100, 0)).toBeUndefined();
  });

  it("returns undefined for non-positive units", () => {
    expect(computePnl(0, 100, 120)).toBeUndefined();
    expect(computePnl(-1, 100, 120)).toBeUndefined();
  });

  it("handles fractional units (crypto-style holdings)", () => {
    const result = computePnl(0.5, 60000, 90000);

    expect(result).toBeDefined();
    expect(result!.costBasis).toBeCloseTo(30000);
    expect(result!.pnl).toBeCloseTo(15000);
    expect(result!.pnlPercent).toBeCloseTo(50);
  });
});

// ──────────────────────────────────────────
// computeWeightedAvgCost
// ──────────────────────────────────────────

describe("computeWeightedAvgCost", () => {
  it("computes the weighted average when buying more at a different price", () => {
    // 10 units at 100, buy 10 more at 200 → 20 units at 150
    expect(computeWeightedAvgCost(10, 100, 10, 200)).toBeCloseTo(150);
  });

  it("weights by units, not by purchase count", () => {
    // 30 units at 10, buy 10 more at 50 → (300 + 500) / 40 = 20
    expect(computeWeightedAvgCost(30, 10, 10, 50)).toBeCloseTo(20);
  });

  it("keeps the average unchanged when buying at the same price", () => {
    expect(computeWeightedAvgCost(10, 75, 5, 75)).toBeCloseTo(75);
  });

  it("uses the price paid when no existing average is recorded", () => {
    expect(computeWeightedAvgCost(10, undefined, 5, 80)).toBeCloseTo(80);
  });

  it("uses the price paid when the position previously had zero units", () => {
    expect(computeWeightedAvgCost(0, 100, 5, 80)).toBeCloseTo(80);
  });

  it("returns undefined for invalid added units or price", () => {
    expect(computeWeightedAvgCost(10, 100, 0, 80)).toBeUndefined();
    expect(computeWeightedAvgCost(10, 100, -5, 80)).toBeUndefined();
    expect(computeWeightedAvgCost(10, 100, 5, 0)).toBeUndefined();
  });

  it("handles fractional units", () => {
    // 0.025 units at 4000, buy 0.025 more at 2000 → 0.05 units at 3000
    expect(computeWeightedAvgCost(0.025, 4000, 0.025, 2000)).toBeCloseTo(3000);
  });
});
