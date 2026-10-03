import test from "node:test";
import assert from "node:assert/strict";
import { countItemsByVault, formatItemCount } from "./item-counts";

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

test("says item or items", () => {
  assert.equal(formatItemCount(0), "0 items");
  assert.equal(formatItemCount(1), "1 item");
  assert.equal(formatItemCount(12), "12 items");
});
