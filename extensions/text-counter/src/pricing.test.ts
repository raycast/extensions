import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Cache: class {
    get() {
      return undefined;
    }
    set() {}
  },
}));

import { buildTokenRows, extractPricing, formatContextUsage } from "./pricing";
import type { CountResult } from "./count";

const counts = {
  tokensO200k: 1000,
  tokensCl100k: 1200,
  tokensClaudeEstimate: 1200,
} as CountResult;

describe("model pricing", () => {
  it("selects the newest Sonnet release", () => {
    const pricing = extractPricing({
      openai: { models: { "gpt-4o": { name: "GPT-4o", cost: { input: 2.5 }, limit: { context: 128000 } } } },
      anthropic: {
        models: {
          "claude-sonnet-old": {
            name: "Old Sonnet",
            cost: { input: 3 },
            limit: { context: 200000 },
            release_date: "2024-06-01",
          },
          "claude-sonnet-new": {
            name: "New Sonnet",
            cost: { input: 5 },
            limit: { context: 300000 },
            release_date: "2026-06-01",
          },
        },
      },
    });

    expect(pricing?.claude).toEqual({ name: "New Sonnet", inputCostPerMTok: 5, contextWindow: 300000 });
  });

  it("shows context usage only for rows tied to a named model", () => {
    const rows = buildTokenRows(counts, null);
    expect(rows.find((row) => row.id === "cl100k")?.contextWindow).toBeUndefined();
    expect(rows.find((row) => row.id === "o200k")?.contextWindow).toBe(128000);
    expect(rows.find((row) => row.id === "claude")?.contextWindow).toBe(200000);
    expect(formatContextUsage(64000, 128000)).toBe("50% of 128k");
  });
});
