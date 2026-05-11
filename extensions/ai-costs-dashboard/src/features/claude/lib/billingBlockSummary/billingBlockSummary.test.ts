import { describe, expect, it } from "vitest";
import {
  parseBillingBlocks,
  summarizeCurrentBillingBlock,
} from "./billingBlockSummary";

const sampleBlocksJson = JSON.stringify({
  blocks: [
    {
      id: "2026-05-07T03:00:00.000Z",
      startTime: "2026-05-07T03:00:00.000Z",
      endTime: "2026-05-07T08:00:00.000Z",
      actualEndTime: "2026-05-07T04:15:00.000Z",
      isActive: false,
      isGap: false,
      entries: 10,
      totalTokens: 1000,
      costUSD: 1.25,
      models: ["claude-sonnet-4-6"],
      burnRate: null,
      projection: null,
    },
    {
      id: "2026-05-07T08:00:00.000Z",
      startTime: "2026-05-07T08:00:00.000Z",
      endTime: "2026-05-07T13:00:00.000Z",
      actualEndTime: "2026-05-07T10:17:15.780Z",
      isActive: true,
      isGap: false,
      entries: 548,
      totalTokens: 36393794,
      costUSD: 32.96823109999999,
      models: ["claude-opus-4-7", "claude-sonnet-4-6"],
      burnRate: {
        tokensPerMinute: 327828.3567939225,
        costPerHour: 17.81829236256372,
      },
      projection: {
        totalTokens: 73288838,
        totalCost: 66.39,
        remainingMinutes: 113,
      },
    },
  ],
});

describe("parseBillingBlocks", () => {
  it("parses ccusage blocks JSON rows", () => {
    const blocks = parseBillingBlocks(sampleBlocksJson);

    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toMatchObject({
      isActive: true,
      totalTokens: 36393794,
      costUSD: 32.96823109999999,
      projectedCostUSD: 66.39,
      remainingMinutes: 113,
    });
  });

  it("throws a readable error when blocks are missing", () => {
    expect(() =>
      parseBillingBlocks(JSON.stringify({ type: "blocks" })),
    ).toThrow("Expected ccusage blocks output to include a blocks array");
  });
});

describe("summarizeCurrentBillingBlock", () => {
  it("returns the active non-gap block", () => {
    const currentBlock = summarizeCurrentBillingBlock(
      parseBillingBlocks(sampleBlocksJson),
    );

    expect(currentBlock?.id).toBe("2026-05-07T08:00:00.000Z");
    expect(currentBlock?.models).toEqual([
      "claude-opus-4-7",
      "claude-sonnet-4-6",
    ]);
  });

  it("returns undefined when there is no active block", () => {
    const currentBlock = summarizeCurrentBillingBlock(
      parseBillingBlocks(
        JSON.stringify({
          blocks: [
            {
              id: "gap",
              startTime: "2026-05-07T08:00:00.000Z",
              endTime: "2026-05-07T13:00:00.000Z",
              isActive: false,
              isGap: true,
            },
          ],
        }),
      ),
    );

    expect(currentBlock).toBeUndefined();
  });
});
