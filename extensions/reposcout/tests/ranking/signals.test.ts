import { describe, expect, it } from "vitest";
import {
  favoriteSignal,
  frequencySignal,
  gitActivitySignal,
  matchSignal,
  pinnedSignal,
  recencySignal,
  shortPathSignal,
} from "../../src/ranking/signals";
import { ONE_DAY_MS } from "../../src/ranking/decay";
import { makeRankable } from "../helpers/fixtures";

const ctx = { query: "app", nowMs: 1_000_000_000_000 };

describe("ranking signals", () => {
  it("matchSignal reflects the fuzzy score and 0 when unmatched", () => {
    const repo = makeRankable();
    expect(matchSignal.score(repo, { score: 0.8, positions: [] }, ctx)).toBe(0.8);
    expect(matchSignal.score(repo, null, ctx)).toBe(0);
  });

  it("pinnedSignal is 1 only when pinned and carries the dominant weight", () => {
    expect(pinnedSignal.score(makeRankable({}, { pinned: true }), null, ctx)).toBe(1);
    expect(pinnedSignal.score(makeRankable(), null, ctx)).toBe(0);
    expect(pinnedSignal.weight).toBeGreaterThan(matchSignal.weight);
  });

  it("favoriteSignal is 1 only when favorited", () => {
    expect(favoriteSignal.score(makeRankable({}, { favorite: true }), null, ctx)).toBe(1);
    expect(favoriteSignal.score(makeRankable(), null, ctx)).toBe(0);
  });

  it("recencySignal rewards recently opened repositories", () => {
    const recent = makeRankable({}, { lastOpenedAt: ctx.nowMs - ONE_DAY_MS });
    const never = makeRankable();
    expect(recencySignal.score(recent, null, ctx)).toBeGreaterThan(0);
    expect(recencySignal.score(never, null, ctx)).toBe(0);
  });

  it("frequencySignal rewards frequently opened repositories", () => {
    const often = makeRankable({}, { openCount: 20 });
    const once = makeRankable({}, { openCount: 1 });
    expect(frequencySignal.score(often, null, ctx)).toBeGreaterThan(frequencySignal.score(once, null, ctx));
  });

  it("gitActivitySignal rewards recent commits (seconds → ms)", () => {
    const active = makeRankable({ lastCommitAt: Math.floor(ctx.nowMs / 1000) });
    const stale = makeRankable({ lastCommitAt: Math.floor((ctx.nowMs - 365 * ONE_DAY_MS) / 1000) });
    const none = makeRankable({ lastCommitAt: null });
    expect(gitActivitySignal.score(active, null, ctx)).toBeGreaterThan(gitActivitySignal.score(stale, null, ctx));
    expect(gitActivitySignal.score(none, null, ctx)).toBe(0);
  });

  it("shortPathSignal favors shallower paths", () => {
    const shallow = makeRankable({ path: "/a/repo" });
    const deep = makeRankable({ path: "/a/b/c/d/e/repo" });
    expect(shortPathSignal.score(shallow, null, ctx)).toBeGreaterThan(shortPathSignal.score(deep, null, ctx));
  });
});
