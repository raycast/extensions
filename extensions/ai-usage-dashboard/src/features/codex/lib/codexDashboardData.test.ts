import { describe, expect, it } from "vitest";
import { loadCodexUsageDashboardData } from "./codexDashboardData";

describe("loadCodexUsageDashboardData", () => {
  it("loads Codex daily data without a billing block", async () => {
    const data = await loadCodexUsageDashboardData({
      runDaily: async () => ({
        command: "@ccusage/codex daily --json",
        stdout: JSON.stringify({
          daily: [
            {
              date: "Apr 17, 2026",
              inputTokens: 100,
              cachedInputTokens: 25,
              outputTokens: 50,
              totalTokens: 150,
              costUSD: 0.75,
              models: {
                "gpt-5.4": {
                  inputTokens: 100,
                  outputTokens: 50,
                },
              },
            },
          ],
        }),
      }),
    });

    expect(data.summary.total.costUSD).toBe(0.75);
    expect(data.summary.recentDays[0]).toMatchObject({
      date: "2026-04-17",
      models: ["gpt-5.4"],
      cacheReadTokens: 25,
    });
    expect(JSON.parse(data.rawJson)).toMatchObject({
      daily: { daily: expect.any(Array) },
    });
  });
});
