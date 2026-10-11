import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  actionableSelection,
  CLOSED_GRACE_MS,
  parseListState,
  parseSelection,
  quitTarget,
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

describe("Quit Selected App closes a selected window only while its app has others", () => {
  const win = { ...sel, window: { pid: 42, wid: 1475 }, windowCount: 3 };
  it("round-trips the window part and drops a malformed one", () => {
    assert.deepEqual(parseSelection(JSON.stringify(win)), win);
    assert.deepEqual(parseSelection(JSON.stringify({ ...win, window: { pid: 42 }, windowCount: "3" })), sel);
    assert.deepEqual(parseSelection(JSON.stringify({ ...win, window: { pid: 42, wid: -1 } })), { ...sel, windowCount: 3 });
  });
  it("closes the window with two or more windows, quits the app otherwise", () => {
    assert.deepEqual(quitTarget(win), { kind: "window", pid: 42, wid: 1475 });
    assert.deepEqual(quitTarget({ ...win, windowCount: 2 }), { kind: "window", pid: 42, wid: 1475 });
    assert.deepEqual(quitTarget({ ...win, windowCount: 1 }), { kind: "app" }, "last window: quit, not an app with no windows");
    assert.deepEqual(quitTarget({ window: win.window }), { kind: "app" }, "unknown count: quit as before");
    assert.deepEqual(quitTarget(sel), { kind: "app" }, "app row selected");
  });
});
