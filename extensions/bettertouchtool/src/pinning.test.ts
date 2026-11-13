import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePinnedIds, sortPinnedItems, togglePinnedId } from "./pinning";

describe("pinned list entries", () => {
  it("parses unique persisted IDs and tolerates invalid storage", () => {
    assert.deepEqual(parsePinnedIds('["one","two","one",3,""]'), ["one", "two"]);
    assert.deepEqual(parsePinnedIds("not json"), []);
    assert.deepEqual(parsePinnedIds(true), []);
  });

  it("pins new entries first and unpins existing entries", () => {
    assert.deepEqual(togglePinnedId(["one"], "two"), ["two", "one"]);
    assert.deepEqual(togglePinnedId(["one", "two"], "one"), ["two"]);
  });

  it("moves pinned entries to the top while retaining stable list order", () => {
    const items = [{ id: "one" }, { id: "two" }, { id: "three" }, { id: "four" }];
    assert.deepEqual(
      sortPinnedItems(items, new Set(["two", "four"]), (item) => item.id).map((item) => item.id),
      ["two", "four", "one", "three"],
    );
  });
});
