import { describe, expect, it } from "vitest";
import { loadAmpUsageDashboardData } from "./ampDashboardData";

describe("loadAmpUsageDashboardData", () => {
  it("loads AMP daily data", async () => {
    const data = await loadAmpUsageDashboardData({
      runDaily: async () => ({
        command: "@ccusage/amp daily --json",
        stdout: JSON.stringify({
          daily: [
            {
              date: "2026-05-07",
              inputTokens: 100,
              outputTokens: 50,
              cacheReadTokens: 25,
              totalTokens: 175,
              costUSD: 0.75,
              models: ["claude-sonnet-4-6"],
            },
          ],
          totals: null,
        }),
      }),
    });

    expect(data.summary.total.costUSD).toBe(0.75);
    expect(data.summary.recentDays[0]).toMatchObject({
      date: "2026-05-07",
      models: ["claude-sonnet-4-6"],
      totalTokens: 175,
    });
    expect(JSON.parse(data.rawJson)).toMatchObject({
      daily: { daily: expect.any(Array) },
    });
  });
});
