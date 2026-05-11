import { describe, expect, it } from "vitest";
import { parseDailyUsage, summarizeDailyUsage } from "./usageSummary";

const sampleJson = JSON.stringify({
  type: "daily",
  daily: [
    {
      date: "2026-05-01",
      modelsUsed: ["claude-sonnet-4-20250514"],
      inputTokens: 100,
      outputTokens: 200,
      cacheCreationTokens: 300,
      cacheReadTokens: 400,
      totalTokens: 1000,
      totalCost: 1.25,
    },
    {
      date: "2026-05-07",
      modelsUsed: ["claude-opus-4-20250514"],
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationTokens: 30,
      cacheReadTokens: 40,
      totalTokens: 100,
      totalCost: 2.5,
    },
    {
      date: "2026-04-30",
      modelsUsed: ["claude-sonnet-4-20250514"],
      inputTokens: 1,
      outputTokens: 2,
      cacheCreationTokens: 3,
      cacheReadTokens: 4,
      totalTokens: 10,
      totalCost: 0.5,
    },
  ],
  totals: {},
});

describe("parseDailyUsage", () => {
  it("parses ccusage daily JSON rows", () => {
    const result = parseDailyUsage(sampleJson);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      date: "2026-05-01",
      costUSD: 1.25,
      totalTokens: 1000,
    });
  });

  it("throws a readable error for malformed JSON", () => {
    expect(() => parseDailyUsage("{not json")).toThrow(
      "Unable to parse ccusage JSON output",
    );
  });

  it("throws a readable error when data is missing", () => {
    expect(() => parseDailyUsage(JSON.stringify({ type: "daily" }))).toThrow(
      "Expected ccusage daily output to include a daily or data array",
    );
  });

  it("also supports older data/costUSD shaped rows", () => {
    const result = parseDailyUsage(
      JSON.stringify({
        data: [
          {
            date: "2026-05-07",
            models: ["claude-sonnet-4-20250514"],
            totalTokens: 10,
            costUSD: 0.25,
          },
        ],
      }),
    );

    expect(result[0]).toMatchObject({
      models: ["claude-sonnet-4-20250514"],
      totalTokens: 10,
      costUSD: 0.25,
    });
  });

  it("maps @ccusage/codex daily rows into normalized usage rows", () => {
    const result = parseDailyUsage(
      JSON.stringify({
        daily: [
          {
            date: "Apr 17, 2026",
            inputTokens: 2451932,
            cachedInputTokens: 2288640,
            outputTokens: 11900,
            reasoningOutputTokens: 4180,
            totalTokens: 2463832,
            costUSD: 1.15889,
            models: {
              "gpt-5.4": {
                inputTokens: 2451932,
                cachedInputTokens: 2288640,
                outputTokens: 11900,
              },
            },
          },
        ],
      }),
    );

    expect(result[0]).toMatchObject({
      date: "2026-04-17",
      models: ["gpt-5.4"],
      inputTokens: 2451932,
      outputTokens: 11900,
      cacheCreationTokens: 0,
      cacheReadTokens: 2288640,
      totalTokens: 2463832,
      costUSD: 1.15889,
    });
  });
});

describe("summarizeDailyUsage", () => {
  it("computes today, month-to-date, total, and recent days", () => {
    const rows = parseDailyUsage(sampleJson);
    const summary = summarizeDailyUsage(rows, new Date("2026-05-07T12:00:00"));

    expect(summary.today.costUSD).toBe(2.5);
    expect(summary.today.totalTokens).toBe(100);
    expect(summary.monthToDate.costUSD).toBe(3.75);
    expect(summary.monthToDate.totalTokens).toBe(1100);
    expect(summary.total.costUSD).toBe(4.25);
    expect(summary.total.totalTokens).toBe(1110);
    expect(summary.recentDays.map((day) => day.date)).toEqual([
      "2026-05-07",
      "2026-05-01",
      "2026-04-30",
    ]);
  });

  it("uses zero totals when today is absent", () => {
    const rows = parseDailyUsage(sampleJson);
    const summary = summarizeDailyUsage(rows, new Date("2026-05-08T12:00:00"));

    expect(summary.today.costUSD).toBe(0);
    expect(summary.today.totalTokens).toBe(0);
  });
});
