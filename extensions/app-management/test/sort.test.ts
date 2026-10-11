// O-1, O-2, O-3 (automated half), O-5 and the recency store rules (SPEC.md §8).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareRecent,
  otherSort,
  parseRecent,
  parseSort,
  pruneRecent,
  RECENT_CAP,
  serializeRecent,
  sortRows,
  stampRecent,
  type RecentMap,
  type Sortable,
} from "../src/lib/sort.ts";

const s = (name: string, extra: Partial<Sortable> = {}): Sortable => ({
  key: extra.bundleId ?? `com.test.${name.toLowerCase()}`,
  name,
  bundleId: extra.bundleId ?? `com.test.${name.toLowerCase()}`,
  ...extra,
});
const names = (rows: Sortable[]) => rows.map((r) => r.name);

describe("O-1 alphabetical", () => {
  it("is locale-aware, case-insensitive, numeric-aware, ties by key, and identical for identical input", () => {
    const rows = [s("zed"), s("Edge 10"), s("edge 9"), s("Äpfel"), s("apple", { bundleId: "b" }), s("apple", { bundleId: "a" })];
    const once = sortRows(rows, "alphabetical", {});
    // Base sensitivity: Ä and a are equal, so "Äpfel" (…f…) sorts before "apple" (…p…).
    assert.deepEqual(names(once), ["Äpfel", "apple", "apple", "edge 9", "Edge 10", "zed"]);
    assert.deepEqual(
      once.slice(1, 3).map((r) => r.key),
      ["a", "b"],
      "ties by key",
    );
    assert.deepEqual(names(sortRows([...rows].reverse(), "alphabetical", {})), names(once));
    assert.deepEqual(names(rows), ["zed", "Edge 10", "edge 9", "Äpfel", "apple", "apple"], "input not mutated");
  });
});

describe("O-2 recent order", () => {
  const recent: RecentMap = {
    "com.test.mail": { switchedAt: 1000 },
    "com.test.slack": { frontAt: 3000 },
    "com.test.both": { switchedAt: 500, frontAt: 2000 },
  };
  it("stamped apps first by newest stamp (max of the two), then on-screen by zIndex, then alphabetical", () => {
    const rows = [
      s("Zeta"),
      s("Finder", { frontZ: 2 }),
      s("Mail"),
      s("Alpha"),
      s("Both"),
      s("Edge", { frontZ: 0 }),
      s("Slack"),
      s("Chat", { frontZ: 0 }),
    ];
    assert.deepEqual(names(sortRows(rows, "recent", recent)), [
      "Slack", // 3000
      "Both", // max(500, 2000) = 2000
      "Mail", // 1000
      "Chat", // z 0, alphabetical before Edge at z 0
      "Edge",
      "Finder", // z 2
      "Alpha",
      "Zeta",
    ]);
  });
  it("a null zIndex never sorts above a known one; equal stamps fall back to alphabetical", () => {
    assert.ok(compareRecent(s("Aaa"), s("Bbb", { frontZ: 9 }), {}) > 0);
    assert.ok(compareRecent(s("Zzz", { frontZ: 9 }), s("Aaa"), {}) < 0);
    const tie: RecentMap = { "com.test.b": { switchedAt: 7 }, "com.test.a": { frontAt: 7 } };
    assert.deepEqual(names(sortRows([s("B"), s("A")], "recent", tie)), ["A", "B"]);
  });
  it("is deterministic and does not depend on input order", () => {
    const rows = [s("C", { frontZ: 1 }), s("A"), s("B", { frontZ: 1 }), s("D")];
    const a = names(sortRows(rows, "recent", recent));
    const b = names(sortRows([...rows].reverse(), "recent", recent));
    assert.deepEqual(a, b);
    assert.deepEqual(a, ["B", "C", "A", "D"]);
  });
  it("apps keyed by pid (no bundle ID) are never stamped and sort by zIndex or name", () => {
    const rows = [s("Mail"), { key: "pid:9", name: "Agent", frontZ: 0 } as Sortable];
    assert.deepEqual(names(sortRows(rows, "recent", recent)), ["Mail", "Agent"]);
  });
});

describe("O-3 recency persistence rules (pure part)", () => {
  it("stampRecent writes one field, keeps the other, and ignores apps without a bundle ID", () => {
    let map: RecentMap = {};
    map = stampRecent(map, "com.a", "switchedAt", 10);
    map = stampRecent(map, "com.a", "frontAt", 20);
    map = stampRecent(map, undefined, "switchedAt", 30);
    assert.deepEqual(map, { "com.a": { switchedAt: 10, frontAt: 20 } });
  });
  it("caps at 50 bundle IDs, dropping the oldest by newest stamp", () => {
    let map: RecentMap = {};
    for (let i = 1; i <= RECENT_CAP + 5; i++) map = stampRecent(map, `com.n${i}`, "switchedAt", i);
    assert.equal(Object.keys(map).length, RECENT_CAP);
    assert.equal(map["com.n1"], undefined);
    assert.equal(map["com.n5"], undefined);
    assert.deepEqual(map["com.n6"], { switchedAt: 6 });
    assert.deepEqual(map[`com.n${RECENT_CAP + 5}`], { switchedAt: RECENT_CAP + 5 });
  });
  it("round-trips through serialize/parse and drops anything that is not a bundle ID with positive timestamps", () => {
    const map: RecentMap = { "com.a": { switchedAt: 1 }, "com.b": { frontAt: 2, switchedAt: 3 } };
    assert.deepEqual(parseRecent(serializeRecent(map)), map);
    assert.deepEqual(parseRecent(undefined), {});
    assert.deepEqual(parseRecent("{not json"), {});
    assert.deepEqual(parseRecent("[1]"), {});
    assert.deepEqual(parseRecent('{"com.a":{"switchedAt":"x","frontAt":-1},"":{"switchedAt":1},"com.b":5}'), {});
    assert.deepEqual(parseRecent('{"com.a":{"switchedAt":4,"title":"never stored"}}'), { "com.a": { switchedAt: 4 } });
    assert.equal(Object.keys(pruneRecent(parseRecent(serializeRecent(map)))).length, 2);
  });
});

describe("sort mode parsing", () => {
  it("unknown → alphabetical; otherSort flips", () => {
    for (const raw of [undefined, null, "", "Recent", 1]) assert.equal(parseSort(raw), "alphabetical");
    assert.equal(parseSort("recent"), "recent");
    assert.equal(otherSort("recent"), "alphabetical");
    assert.equal(otherSort("alphabetical"), "recent");
  });
});
