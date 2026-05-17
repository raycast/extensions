import { describe, expect, it } from "@jest/globals";
import { SessionUsageCommandResponseSchema } from "./usage-types";

const session = {
  sessionId: "00d27b82",
  inputTokens: 100,
  outputTokens: 50,
  cacheCreationTokens: 10,
  cacheReadTokens: 5,
  totalTokens: 165,
  totalCost: 0.12,
  lastActivity: "2026-05-17T14:00:00.000Z",
  modelsUsed: ["sonnet"],
  modelBreakdowns: [
    {
      modelName: "sonnet",
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationTokens: 10,
      cacheReadTokens: 5,
      cost: 0.12,
    },
  ],
};

const totals = {
  inputTokens: 100,
  outputTokens: 50,
  cacheCreationTokens: 10,
  cacheReadTokens: 5,
  totalCost: 0.12,
  totalTokens: 165,
};

describe("SessionUsageCommandResponseSchema", () => {
  it("parses ccusage v19 session output", () => {
    const result = SessionUsageCommandResponseSchema.parse({
      session: [session],
      totals,
    });

    expect(result.sessions).toEqual([session]);
  });

  it("keeps the previous sessions output format working", () => {
    const result = SessionUsageCommandResponseSchema.parse({
      sessions: [session],
      totals,
    });

    expect(result.sessions).toEqual([session]);
  });
});
