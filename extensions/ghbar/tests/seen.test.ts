import { describe, expect, it } from "vitest";
import { Item } from "../src/core/models";
import {
  SEEN_STATE_VERSION,
  decodeSeenState,
  emptySeenState,
  encodeSeenState,
  isFirstRun,
  isSeen,
  markFirstRunDone,
  markNotified,
  markSeen,
  mergeSeenState,
  newItems,
  prune,
  unnotified,
  unseenCount,
} from "../src/core/seen";

function makeItem(n: number): Item {
  return {
    kind: "pullRequest",
    repository: "alice/webapp",
    number: n,
    title: "t",
    url: `https://example.com/${n}`,
    createdAt: "2026-08-18T07:00:00Z",
    isDraft: false,
    authorLogin: "bob",
    authorIsBot: false,
  };
}

const NOW = new Date("2026-08-18T12:00:00Z");

describe("seen", () => {
  it("mark and read back", () => {
    let state = emptySeenState();
    expect(isSeen(state, "https://example.com/1")).toBe(false);
    state = markSeen(state, ["https://example.com/1"], NOW);
    expect(isSeen(state, "https://example.com/1")).toBe(true);
  });

  it("round-trips through encode and decode", () => {
    let state = emptySeenState();
    state = markSeen(state, ["https://example.com/1"], NOW);
    const { state: reloaded } = decodeSeenState(encodeSeenState(state));
    expect(isSeen(reloaded, "https://example.com/1")).toBe(true);
    expect(reloaded.version).toBe(SEEN_STATE_VERSION);
  });

  it("the first-run flag is true once, then false", () => {
    const state = emptySeenState();
    expect(isFirstRun(state)).toBe(true);
    const [after, changed] = markFirstRunDone(state);
    expect(changed).toBe(true);
    expect(isFirstRun(after)).toBe(false);
    expect(markFirstRunDone(after)[1]).toBe(false);
  });

  it("the first run does NOT mark items seen", () => {
    // Marking everything seen here made the first launch start fully faded
    // with "Mark All as Seen" having nothing to do.
    const [state] = markFirstRunDone(emptySeenState());
    expect(newItems(state, [makeItem(1), makeItem(2)])).toHaveLength(2);
    expect(isSeen(state, "https://example.com/1")).toBe(false);
  });

  it("unseen items come back correctly", () => {
    const state = markSeen(emptySeenState(), ["https://example.com/1"], NOW);
    expect(newItems(state, [makeItem(1), makeItem(2), makeItem(3)]).map((i) => i.number)).toEqual([2, 3]);
    expect(unseenCount(state, [makeItem(1), makeItem(2), makeItem(3)])).toBe(2);
  });

  it("records absent from the live set are pruned", () => {
    let state = markSeen(emptySeenState(), ["a", "b", "c"], NOW);
    state = prune(state, new Set(["a", "c"]));
    expect(isSeen(state, "a")).toBe(true);
    expect(isSeen(state, "b")).toBe(false);
    expect(isSeen(state, "c")).toBe(true);
  });

  it("corrupt data resets instead of throwing", () => {
    const { state, needsNotificationBackfill } = decodeSeenState("this is not json");
    expect(isFirstRun(state)).toBe(true);
    expect(isSeen(state, "anything")).toBe(false);
    expect(needsNotificationBackfill).toBe(false);
  });

  it("empty or undefined data yields an empty state", () => {
    expect(isFirstRun(decodeSeenState(undefined).state)).toBe(true);
    expect(isFirstRun(decodeSeenState("").state)).toBe(true);
    expect(isFirstRun(decodeSeenState("[1,2,3]").state)).toBe(true);
  });
});

describe("seen.notified", () => {
  it("an announced item is never announced again", () => {
    let state = markFirstRunDone(emptySeenState())[0];
    const items = [makeItem(1), makeItem(2)];
    expect(unnotified(state, items)).toHaveLength(2);
    state = markNotified(
      state,
      items.map((i) => i.url),
    );
    expect(unnotified(state, items)).toHaveLength(0);
    // a new item arrives and only that one comes back
    expect(unnotified(state, [...items, makeItem(3)]).map((i) => i.number)).toEqual([3]);
  });

  it("notified is independent of seen", () => {
    const state = markNotified(emptySeenState(), [makeItem(1).url]);
    expect(isSeen(state, makeItem(1).url)).toBe(false); // bildirildi ama gorulmedi
  });

  it("round-trips through encode and decode", () => {
    let state = markFirstRunDone(emptySeenState())[0];
    state = markNotified(state, ["https://example.com/1"]);
    const { state: reloaded, needsNotificationBackfill } = decodeSeenState(encodeSeenState(state));
    expect(unnotified(reloaded, [makeItem(1)])).toHaveLength(0);
    expect(needsNotificationBackfill).toBe(false);
  });

  it("prune clears the notified set too", () => {
    let state = markNotified(emptySeenState(), ["a", "b"]);
    state = prune(state, new Set(["a"]));
    // "b" was dropped, so a reopened URL can be announced again
    expect(state.notified).toEqual(["a"]);
  });

  it("v1 data (no notified field) counts as an upgrade: a ONE-TIME backfill", () => {
    // The real failure case: bootstrapped=true with no notified field at all
    const { state, needsNotificationBackfill } = decodeSeenState('{"version":1,"bootstrapped":true,"seen":{}}');
    expect(needsNotificationBackfill).toBe(true);
    expect(isFirstRun(state)).toBe(false);
  });

  it("a fresh install triggers no backfill", () => {
    expect(decodeSeenState(encodeSeenState(emptySeenState())).needsNotificationBackfill).toBe(false);
  });

  it("bootstrapped false triggers no backfill", () => {
    // Never run yet: the first refresh marks everything announced anyway.
    expect(decodeSeenState('{"version":1,"bootstrapped":false,"seen":{}}').needsNotificationBackfill).toBe(false);
  });
});

describe("mergeSeenState", () => {
  it("merges seen records from both sides", () => {
    const a = markSeen(emptySeenState(), ["a"], new Date("2026-08-18T10:00:00Z"));
    const b = markSeen(emptySeenState(), ["b"], new Date("2026-08-18T11:00:00Z"));
    const merged = mergeSeenState(a, b);
    expect(isSeen(merged, "a")).toBe(true);
    expect(isSeen(merged, "b")).toBe(true);
  });

  it("when a URL is on both sides the EARLIER timestamp wins", () => {
    // The question being answered is "when did we first see this".
    const early = markSeen(emptySeenState(), ["a"], new Date("2026-08-18T10:00:00Z"));
    const late = markSeen(emptySeenState(), ["a"], new Date("2026-08-18T12:00:00Z"));
    expect(mergeSeenState(late, early).seen["a"]).toBe("2026-08-18T10:00:00.000Z");
    expect(mergeSeenState(early, late).seen["a"]).toBe("2026-08-18T10:00:00.000Z");
  });

  it("a STALE state does not clobber fresh marks", () => {
    // The real race: the user hits "Mark All as Seen" while a background
    // refresh is already in flight holding the old (empty) state, which it
    // writes back when its round-trip finishes.
    const stale = emptySeenState();
    const fresh = markSeen(emptySeenState(), ["a", "b", "c"], new Date("2026-08-18T12:00:00Z"));
    const merged = mergeSeenState(fresh, stale);
    expect(unseenCount(merged, [makeItem(1)])).toBe(1); // /1 was never marked
    expect(isSeen(merged, "a")).toBe(true);
    expect(isSeen(merged, "b")).toBe(true);
    expect(isSeen(merged, "c")).toBe(true);
  });

  it("notified sets are unioned", () => {
    const a = markNotified(emptySeenState(), ["a", "b"]);
    const b = markNotified(emptySeenState(), ["b", "c"]);
    expect(mergeSeenState(a, b).notified.sort()).toEqual(["a", "b", "c"]);
  });

  it("if either side bootstrapped, the result is bootstrapped", () => {
    const done = markFirstRunDone(emptySeenState())[0];
    expect(mergeSeenState(done, emptySeenState()).bootstrapped).toBe(true);
    expect(mergeSeenState(emptySeenState(), done).bootstrapped).toBe(true);
    expect(mergeSeenState(emptySeenState(), emptySeenState()).bootstrapped).toBe(false);
  });

  it("pruning after the merge really drops dead URLs", () => {
    // commitSeenState merges FIRST, prunes SECOND. The other order would let
    // the merge reinstate dead URLs and undo the prune.
    const stored = markSeen(emptySeenState(), ["dead", "alive"], new Date("2026-08-18T10:00:00Z"));
    const incoming = markSeen(emptySeenState(), ["alive"], new Date("2026-08-18T11:00:00Z"));
    const merged = prune(mergeSeenState(stored, incoming), new Set(["alive"]));
    expect(isSeen(merged, "alive")).toBe(true);
    expect(isSeen(merged, "dead")).toBe(false);
  });
});
