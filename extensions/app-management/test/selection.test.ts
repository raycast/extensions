import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  actionableSelection,
  CLOSED_GRACE_MS,
  parseListState,
  parseSelection,
  SELECTION_FRESH_MS,
} from "../src/lib/selection.ts";

const sel = { key: "com.apple.calculator", name: "Calculator", bundleId: "com.apple.calculator", pids: [42], at: 1000 };

describe("hotkey commands act only on a live selection", () => {
  it("round-trips the stored shapes and rejects junk", () => {
    assert.deepEqual(parseSelection(JSON.stringify(sel)), sel);
    for (const bad of [undefined, 5, "{", "{}", JSON.stringify({ ...sel, pids: ["x"] })]) assert.equal(parseSelection(bad), undefined);
    assert.deepEqual(parseListState(JSON.stringify({ open: true, at: 7 })), { open: true, at: 7 });
    assert.equal(parseListState('{"open":"yes"}'), undefined);
  });
  it("acts while the list is open, within the grace period after it closed, and never later", () => {
    assert.deepEqual(actionableSelection(sel, { open: true, at: 1 }, 1000 + SELECTION_FRESH_MS), sel);
    assert.equal(actionableSelection(sel, { open: true, at: 1 }, 1000 + SELECTION_FRESH_MS + 1), undefined, "stale selection");
    assert.deepEqual(actionableSelection({ ...sel, at: 9000 }, { open: false, at: 10_000 }, 10_000 + CLOSED_GRACE_MS), { ...sel, at: 9000 });
    assert.equal(actionableSelection({ ...sel, at: 9000 }, { open: false, at: 10_000 }, 10_000 + CLOSED_GRACE_MS + 1), undefined, "closed after the selection, past the grace");
    assert.deepEqual(actionableSelection(sel, { open: false, at: 500 }, 1500), sel, "a close before the selection does not matter");
    assert.equal(actionableSelection(undefined, { open: true, at: 1 }, 2), undefined);
    assert.deepEqual(actionableSelection(sel, undefined, 1500), sel, "no list state yet: the fresh selection counts");
    assert.deepEqual(parseListState(JSON.stringify({ open: true, at: 7, id: "m1" })), { open: true, at: 7, id: "m1" });
  });
});
