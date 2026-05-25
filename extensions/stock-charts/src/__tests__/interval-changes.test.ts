import { describe, it, expect } from "vitest";
import type { ChartData } from "../yahoo-finance/chart";

/**
 * Tests for the interval change computation logic extracted from
 * useIntervalChanges. We test the pure computation that maps
 * fetchChart results to IntervalChange records.
 */

interface IntervalChange {
  changePercent: number;
  change: number;
}

function computeIntervalChanges(
  results: PromiseSettledResult<ChartData>[],
  symbols: string[],
): Record<string, IntervalChange> {
  const map: Record<string, IntervalChange> = {};
  for (let i = 0; i < symbols.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;
    const { closes } = result.value;
    if (closes.length < 2) continue;
    const first = closes[0];
    const last = closes[closes.length - 1];
    if (first === 0) continue;
    map[symbols[i]] = {
      change: last - first,
      changePercent: ((last - first) / first) * 100,
    };
  }
  return map;
}

function makeChartData(closes: number[]): ChartData {
  return {
    timestamps: closes.map((_, i) => 1700000000 + i * 86400),
    closes,
    opens: closes,
    highs: closes,
    lows: closes,
    volumes: closes.map(() => 1000000),
    meta: {
      regularMarketPrice: closes[closes.length - 1],
      chartPreviousClose: closes[0],
      currency: "USD",
      symbol: "TEST",
    },
  };
}

describe("Interval change computation", () => {
  it("computes positive change correctly", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([100, 105, 110]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL"]);

    expect(changes["AAPL"].change).toBe(10);
    expect(changes["AAPL"].changePercent).toBe(10);
  });

  it("computes negative change correctly", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([200, 180, 160]) },
    ];

    const changes = computeIntervalChanges(results, ["TSLA"]);

    expect(changes["TSLA"].change).toBe(-40);
    expect(changes["TSLA"].changePercent).toBe(-20);
  });

  it("handles multiple symbols", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([100, 110]) },
      { status: "fulfilled", value: makeChartData([50, 45]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL", "TSLA"]);

    expect(changes["AAPL"].changePercent).toBe(10);
    expect(changes["TSLA"].changePercent).toBe(-10);
  });

  it("skips rejected promises", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([100, 120]) },
      { status: "rejected", reason: new Error("network error") },
      { status: "fulfilled", value: makeChartData([50, 55]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL", "TSLA", "MSFT"]);

    expect(changes["AAPL"]).toBeDefined();
    expect(changes["TSLA"]).toBeUndefined();
    expect(changes["MSFT"]).toBeDefined();
  });

  it("skips symbols with fewer than 2 closes", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([100]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL"]);

    expect(changes["AAPL"]).toBeUndefined();
  });

  it("skips symbols with empty closes", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL"]);

    expect(changes["AAPL"]).toBeUndefined();
  });

  it("skips symbols where first close is 0 (division by zero)", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([0, 100, 200]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL"]);

    expect(changes["AAPL"]).toBeUndefined();
  });

  it("returns empty map for empty input", () => {
    const changes = computeIntervalChanges([], []);
    expect(changes).toEqual({});
  });

  it("computes fractional percentages correctly", () => {
    const results: PromiseSettledResult<ChartData>[] = [
      { status: "fulfilled", value: makeChartData([197.19, 198.42]) },
    ];

    const changes = computeIntervalChanges(results, ["AAPL"]);

    expect(changes["AAPL"].change).toBeCloseTo(1.23, 2);
    expect(changes["AAPL"].changePercent).toBeCloseTo(0.6237, 2);
  });
});
