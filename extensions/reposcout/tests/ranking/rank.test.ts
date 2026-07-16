import { describe, expect, it } from "vitest";
import { scoreRepository } from "../../src/ranking/rank";
import type { RankingSignal } from "../../src/ranking/signals";
import { makeRankable } from "../helpers/fixtures";

const ctx = { query: "app", nowMs: 1_000_000_000_000 };

describe("scoreRepository", () => {
  it("blends signals by weight", () => {
    const signals: RankingSignal[] = [
      { name: "a", weight: 2, score: () => 0.5 },
      { name: "b", weight: 10, score: () => 0.1 },
    ];
    expect(scoreRepository(makeRankable(), null, ctx, signals)).toBeCloseTo(2 * 0.5 + 10 * 0.1, 5);
  });

  it("ranks a pinned repo above a strong pure match by default", () => {
    const pinned = makeRankable({}, { pinned: true });
    const matched = makeRankable();
    const pinnedScore = scoreRepository(pinned, { score: 0.1, positions: [] }, ctx);
    const matchedScore = scoreRepository(matched, { score: 1, positions: [] }, ctx);
    expect(pinnedScore).toBeGreaterThan(matchedScore);
  });

  it("returns 0 when the provided signals all score 0", () => {
    const zero: RankingSignal[] = [{ name: "z", weight: 5, score: () => 0 }];
    expect(scoreRepository(makeRankable(), null, ctx, zero)).toBe(0);
  });

  it("still yields a positive score from the short-path tie-breaker alone", () => {
    // With no match and no user data, only shortPathSignal contributes.
    expect(scoreRepository(makeRankable(), null, ctx)).toBeGreaterThan(0);
  });
});
