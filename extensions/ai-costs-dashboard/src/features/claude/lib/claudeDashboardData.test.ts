import { describe, expect, it } from "vitest";
import { loadAiUsageDashboardData } from "./claudeDashboardData";

const dailyStdout = JSON.stringify({
  daily: [
    {
      date: "2026-05-07",
      modelsUsed: ["claude-sonnet-4-6"],
      inputTokens: 10,
      outputTokens: 20,
      cacheCreationTokens: 30,
      cacheReadTokens: 40,
      totalTokens: 100,
      totalCost: 2.5,
    },
  ],
});

const blocksStdout = JSON.stringify({
  blocks: [
    {
      id: "2026-05-07T08:00:00.000Z",
      startTime: "2026-05-07T08:00:00.000Z",
      endTime: "2026-05-07T13:00:00.000Z",
      isActive: true,
      isGap: false,
      entries: 5,
      totalTokens: 100,
      costUSD: 2.5,
      models: ["claude-sonnet-4-6"],
    },
  ],
});

describe("loadAiUsageDashboardData", () => {
  it("loads daily and block data into dashboard state", async () => {
    const data = await loadAiUsageDashboardData({
      runBlocks: async () => ({
        command: "ccusage blocks --json",
        stdout: blocksStdout,
      }),
      runDaily: async () => ({
        command: "ccusage daily --json",
        stdout: dailyStdout,
      }),
    });

    expect(data.summary.total.costUSD).toBe(2.5);
    expect(data.currentBlock?.id).toBe("2026-05-07T08:00:00.000Z");
    expect(JSON.parse(data.rawJson)).toMatchObject({
      daily: { daily: expect.any(Array) },
      blocks: { blocks: expect.any(Array) },
    });
  });

  it("throws a dashboard error with raw JSON when parsing fails", async () => {
    await expect(
      loadAiUsageDashboardData({
        runBlocks: async () => ({
          command: "ccusage blocks --json",
          stdout: blocksStdout,
        }),
        runDaily: async () => ({
          command: "ccusage daily --json",
          stdout: JSON.stringify({ nope: [] }),
        }),
      }),
    ).rejects.toMatchObject({
      markdown: expect.stringContaining("Invalid ccusage Output"),
      rawJson: expect.stringContaining("blocks"),
    });
  });
});
