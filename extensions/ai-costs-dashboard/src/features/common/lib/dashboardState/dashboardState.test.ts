import { describe, expect, it } from "vitest";
import { buildRawJson, createSummaryMetrics } from "./dashboardState";
import type { UsageSummary } from "../usageSummary/usageSummary";

const emptyTotals = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 0,
  costUSD: 0,
};

const summary: UsageSummary = {
  today: { ...emptyTotals, totalTokens: 100, costUSD: 2.5 },
  monthToDate: { ...emptyTotals, totalTokens: 1000, costUSD: 10 },
  total: { ...emptyTotals, totalTokens: 5000, costUSD: 50 },
  recentDays: [],
};

describe("createSummaryMetrics", () => {
  it("creates the dashboard summary rows in display order", () => {
    const metrics = createSummaryMetrics(summary);

    expect(metrics.map((metric) => metric.id)).toEqual([
      "today",
      "monthToDate",
      "total",
    ]);
    expect(metrics[1].title).toBe("This Month");
    expect(metrics[0].totals).toBe(summary.today);
  });
});

describe("buildRawJson", () => {
  it("combines daily and blocks stdout into a readable JSON document", () => {
    const rawJson = buildRawJson(
      JSON.stringify({ daily: [] }),
      JSON.stringify({ blocks: [] }),
    );

    expect(JSON.parse(rawJson)).toEqual({
      daily: { daily: [] },
      blocks: { blocks: [] },
    });
  });
});
