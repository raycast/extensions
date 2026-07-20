import { describe, expect, it } from "@jest/globals";
import {
  BlocksCommandResponseSchema,
  DailyUsageCommandResponseSchema,
  MonthlyUsageCommandResponseSchema,
  SessionUsageCommandResponseSchema,
  WeeklyUsageCommandResponseSchema,
} from "./usage-types";

const tokenCounts = {
  inputTokens: 1,
  outputTokens: 1,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 2,
  totalCost: 0.01,
};

const modelBreakdown = {
  modelName: "claude-opus-4-7",
  inputTokens: 1,
  outputTokens: 1,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  cost: 0.01,
};

const rowBase = {
  ...tokenCounts,
  modelsUsed: ["claude-opus-4-7"],
  modelBreakdowns: [modelBreakdown],
};

const totals = { ...tokenCounts };

describe("DailyUsageCommandResponseSchema", () => {
  it("parses ccusage v20 rows keyed by `period` and `metadata.agents`", () => {
    const result = DailyUsageCommandResponseSchema.parse({
      daily: [{ ...rowBase, period: "2026-05-24", agent: "all", metadata: { agents: ["claude", "codex"] } }],
    });

    expect(result.daily[0].date).toBe("2026-05-24");
    expect(result.daily[0].metadata?.agents).toEqual(["claude", "codex"]);
  });

  it("parses legacy rows that already carry `date`", () => {
    const result = DailyUsageCommandResponseSchema.parse({
      daily: [{ ...rowBase, date: "2026-05-24" }],
    });

    expect(result.daily[0].date).toBe("2026-05-24");
  });

  it("accepts `metadata` without an `agents` field", () => {
    const result = DailyUsageCommandResponseSchema.parse({
      daily: [{ ...rowBase, period: "2026-05-24", metadata: {} }],
    });

    expect(result.daily[0].metadata?.agents).toBeUndefined();
  });
});

describe("WeeklyUsageCommandResponseSchema", () => {
  it("parses ccusage v20 weekly rows keyed by `period`", () => {
    const result = WeeklyUsageCommandResponseSchema.parse({
      weekly: [{ ...rowBase, period: "2026-05-18", agent: "all", metadata: { agents: ["claude"] } }],
    });

    expect(result.weekly[0].week).toBe("2026-05-18");
  });
});

describe("MonthlyUsageCommandResponseSchema", () => {
  it("parses ccusage v20 monthly rows keyed by `period`", () => {
    const result = MonthlyUsageCommandResponseSchema.parse({
      monthly: [{ ...rowBase, period: "2026-05", agent: "all", metadata: { agents: ["claude"] } }],
    });

    expect(result.monthly[0].month).toBe("2026-05");
  });

  it("parses legacy rows that already carry `month`", () => {
    const result = MonthlyUsageCommandResponseSchema.parse({
      monthly: [{ ...rowBase, month: "2026-05" }],
    });

    expect(result.monthly[0].month).toBe("2026-05");
  });
});

describe("SessionUsageCommandResponseSchema", () => {
  it("parses ccusage v20 sessions with `session` top key, `period`, and `metadata.lastActivity`", () => {
    const result = SessionUsageCommandResponseSchema.parse({
      session: [
        {
          ...rowBase,
          period: "abc-123",
          agent: "claude",
          metadata: { lastActivity: "2026-05-24" },
        },
      ],
      totals,
    });

    expect(result.sessions[0].sessionId).toBe("abc-123");
    expect(result.sessions[0].lastActivity).toBe("2026-05-24");
  });

  it("parses legacy sessions with `sessions` top key and top-level `sessionId`/`lastActivity`", () => {
    const result = SessionUsageCommandResponseSchema.parse({
      sessions: [{ ...rowBase, sessionId: "abc-123", lastActivity: "2026-05-24" }],
      totals,
    });

    expect(result.sessions[0].sessionId).toBe("abc-123");
    expect(result.sessions[0].lastActivity).toBe("2026-05-24");
  });

  it("accepts a session with no `metadata` at all, leaving `lastActivity` undefined", () => {
    // ccusage emits some rows (e.g. a non-Claude agent) without a metadata
    // object, so neither a top-level nor a nested lastActivity exists. One such
    // row must not fail the whole list. See raycast/extensions#28423.
    const result = SessionUsageCommandResponseSchema.parse({
      session: [{ ...rowBase, period: "abc-123", agent: "claude" }],
      totals,
    });

    expect(result.sessions[0].sessionId).toBe("abc-123");
    expect(result.sessions[0].lastActivity).toBeUndefined();
  });

  it("accepts a session whose `metadata.lastActivity` is null, leaving `lastActivity` undefined", () => {
    const result = SessionUsageCommandResponseSchema.parse({
      session: [{ ...rowBase, period: "abc-123", metadata: { lastActivity: null } }],
      totals,
    });

    expect(result.sessions[0].lastActivity).toBeUndefined();
  });

  it("keeps dated sessions intact when one in the list is dateless", () => {
    const result = SessionUsageCommandResponseSchema.parse({
      session: [
        { ...rowBase, period: "dated", metadata: { lastActivity: "2026-05-24" } },
        { ...rowBase, period: "dateless", agent: "claude" },
      ],
      totals,
    });

    expect(result.sessions.map((s) => s.lastActivity)).toEqual(["2026-05-24", undefined]);
  });
});

describe("BlocksCommandResponseSchema", () => {
  const baseBlock = {
    id: "2026-05-24T17:00:00.000Z",
    startTime: "2026-05-24T17:00:00.000Z",
    endTime: "2026-05-24T22:00:00.000Z",
    actualEndTime: null,
    isActive: true,
    isGap: false,
    totalTokens: 100,
    costUSD: 1.5,
    models: ["claude-opus-4-7"],
  };

  it("parses an active block with `burnRate` and `projection`", () => {
    const result = BlocksCommandResponseSchema.parse({
      blocks: [
        {
          ...baseBlock,
          burnRate: { costPerHour: 65, tokensPerMinute: 1000 },
          projection: { remainingMinutes: 156, totalCost: 306, totalTokens: 50000 },
        },
      ],
    });

    expect(result.blocks[0].burnRate?.costPerHour).toBe(65);
    expect(result.blocks[0].projection?.totalCost).toBe(306);
  });

  it("parses an inactive block where `burnRate` and `projection` are null", () => {
    const result = BlocksCommandResponseSchema.parse({
      blocks: [{ ...baseBlock, isActive: false, burnRate: null, projection: null }],
    });

    expect(result.blocks[0].burnRate).toBeNull();
    expect(result.blocks[0].projection).toBeNull();
  });

  it("parses a legacy block with neither `burnRate` nor `projection` present", () => {
    const result = BlocksCommandResponseSchema.parse({
      blocks: [baseBlock],
    });

    expect(result.blocks[0].burnRate).toBeUndefined();
  });
});
