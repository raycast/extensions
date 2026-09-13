import { describe, expect, it } from "vitest";
import { costPerTurn, picksFor, quotaFor } from "../src/lib/quota";
import type { Model } from "../src/lib/types";

const NOW = new Date("2026-09-08T10:00:00Z");

describe("costPerTurn", () => {
  it("uses the reference typical-turn weighting", () => {
    expect(costPerTurn({ input: 0.22, output: 0.66, cacheRead: 0.007 })).toBeCloseTo(0.0008778, 10);
  });

  it("falls back to 2% of input when cache_read is absent", () => {
    expect(costPerTurn({ input: 0.5, output: 2, cacheRead: 0 })).toBeCloseTo(0.00172, 10);
  });
});

describe("quotaFor", () => {
  it("computes floor of the rolling $12 budget divided by cost per turn", () => {
    expect(quotaFor({ input: 0.22, output: 0.66, cacheRead: 0.007 })).toBe(13670);
  });

  it("returns 0 for a zero-cost model", () => {
    expect(quotaFor({ input: 0, output: 0, cacheRead: 0 })).toBe(0);
  });
});

function m(id: string, quota: number | null): Model {
  return { id, cost: null, modalities: null, quota, isPick: null };
}

describe("picksFor", () => {
  it("picks stretch and best-value by req/5h", () => {
    const picks = picksFor([m("c", 180), m("a", 240), m("b", 210)], NOW);
    expect(picks.stretch).toBe("a");
    expect(picks.bestValue).toBe("b");
  });

  it("ignores models without a quota", () => {
    const picks = picksFor([m("a", null), m("b", 5)], NOW);
    expect(picks.stretch).toBe("b");
    expect(picks.bestValue).toBeNull();
  });

  it("returns null picks for an empty catalog", () => {
    const picks = picksFor([], NOW);
    expect(picks.stretch).toBeNull();
    expect(picks.bestValue).toBeNull();
  });

  it("breaks req/5h ties deterministically by id", () => {
    const picks = picksFor([m("b", 240), m("a", 240)], NOW);
    expect(picks.stretch).toBe("a");
    expect(picks.bestValue).toBe("b");
  });

  it("stamps the computedAt timestamp", () => {
    const picks = picksFor([m("a", 1)], NOW);
    expect(picks.computedAt).toBe(NOW.toISOString());
  });
});