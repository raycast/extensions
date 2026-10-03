import test from "node:test";
import assert from "node:assert/strict";
import { countItemsByVault, formatItemCount, refreshItemCounts, titleWithCount, totalItemCount } from "./item-counts";

test("counts the items of each vault, empty vaults included", () => {
  const vaults = [{ shareId: "personal" }, { shareId: "work" }, { shareId: "empty" }];
  const items = [{ shareId: "personal" }, { shareId: "work" }, { shareId: "personal" }, { shareId: "other" }];

  assert.deepEqual(
    [...countItemsByVault(vaults, items)],
    [
      ["personal", 2],
      ["work", 1],
      ["empty", 0],
    ],
  );
});

test("a vault whose items couldn't be listed keeps its earlier count, if any", () => {
  const previous = new Map([
    ["personal", 5],
    ["work", 3],
  ]);
  const vaults = [{ shareId: "personal" }, { shareId: "work" }, { shareId: "new" }];
  const items = [{ shareId: "personal" }, { shareId: "personal" }];

  assert.deepEqual(Object.fromEntries(refreshItemCounts(previous, vaults, items, new Set(["work", "new"]))), {
    personal: 2,
    work: 3,
  });
});

test("totals the vaults only when each has a count", () => {
  const counts = new Map([
    ["personal", 2],
    ["work", 1],
  ]);

  assert.equal(totalItemCount([{ shareId: "personal" }, { shareId: "work" }], counts), 3);
  assert.equal(totalItemCount([{ shareId: "personal" }, { shareId: "unknown" }], counts), undefined);
  assert.equal(totalItemCount([], counts), undefined);
});

test("says item or items", () => {
  assert.equal(formatItemCount(0), "0 items");
  assert.equal(formatItemCount(1), "1 item");
  assert.equal(formatItemCount(12), "12 items");
});

test("adds the count to a title once it's known", () => {
  assert.equal(titleWithCount("Personal", 12), "Personal · 12");
  assert.equal(titleWithCount("Personal", 0), "Personal · 0");
  assert.equal(titleWithCount("Personal", undefined), "Personal");
});
