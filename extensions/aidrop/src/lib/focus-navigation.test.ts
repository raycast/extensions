import test from "node:test";
import assert from "node:assert/strict";

import { getAdjacentItemId } from "./focus-navigation";

test("getAdjacentItemId moves to the next visible item", () => {
  assert.equal(getAdjacentItemId(["a", "b", "c"], "b", "next"), "c");
});

test("getAdjacentItemId moves to the previous visible item", () => {
  assert.equal(getAdjacentItemId(["a", "b", "c"], "b", "previous"), "a");
});

test("getAdjacentItemId clamps at the list boundaries", () => {
  assert.equal(getAdjacentItemId(["a", "b", "c"], "a", "previous"), "a");
  assert.equal(getAdjacentItemId(["a", "b", "c"], "c", "next"), "c");
});

test("getAdjacentItemId falls back to the first visible item when none is focused", () => {
  assert.equal(getAdjacentItemId(["a", "b", "c"], null, "next"), "a");
});
