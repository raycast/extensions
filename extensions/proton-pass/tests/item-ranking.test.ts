import assert from "node:assert/strict";
import test from "node:test";
import { rankItems } from "../src/items/item-ranking";

test("ranks pinned items first and other items by recent use", () => {
  const items = [
    { shareId: "s", itemId: "old", title: "Old" },
    { shareId: "s", itemId: "pinned", title: "Pinned" },
    { shareId: "s", itemId: "recent", title: "Recent" },
  ];
  const activity = {
    "s:pinned": { pinned: true, lastUsedAt: 1 },
    "s:recent": { pinned: false, lastUsedAt: 3 },
    "s:old": { pinned: false, lastUsedAt: 2 },
  };
  assert.deepEqual(
    rankItems(items, activity).map((item) => item.itemId),
    ["pinned", "recent", "old"],
  );
});
