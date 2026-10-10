// Run with: node --test test/tab-snapshot.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkOpenedTab, findNewTab, type TabSnapshot } from "../src/tab-snapshot.ts";

const tab = (url: string, title = url) => ({ title, url });
const requested = new URL("https://example.com/");

const before: TabSnapshot = [
  { windowRef: 10, windowId: 1, tabs: [tab("https://example.com/?t=5"), tab("https://news.ycombinator.com/")] },
  { windowRef: 20, windowId: 2, tabs: [tab("https://www.raycast.com/")] },
];

test("finds a tab appended at the end of a window", () => {
  const after: TabSnapshot = [{ ...before[0], tabs: [...before[0].tabs, tab("https://example.com/")] }, before[1]];
  assert.deepEqual(findNewTab(before, after), { windowRef: 10, windowId: 1, index: 3, ...tab("https://example.com/") });
});

test("finds a tab inserted in the middle, after the current tab", () => {
  const after: TabSnapshot = [
    { ...before[0], tabs: [before[0].tabs[0], tab("https://example.com/"), before[0].tabs[1]] },
    before[1],
  ];
  assert.equal(findNewTab(before, after)?.index, 2);
});

test("finds a tab in a new window, with the window's new position", () => {
  const after: TabSnapshot = [
    { windowRef: 30, windowId: 1, tabs: [tab("https://example.com/")] },
    { ...before[0], windowId: 2 },
    { ...before[1], windowId: 3 },
  ];
  assert.deepEqual(findNewTab(before, after), { windowRef: 30, windowId: 1, index: 1, ...tab("https://example.com/") });
});

test("never verifies an existing tab on the same site, even if a new tab opened in the background", () => {
  // The existing example.com tab stays focused; the new tab is elsewhere and shows another site
  const after: TabSnapshot = [
    { ...before[0], tabs: [...before[0].tabs, tab("https://other.example.org/")] },
    before[1],
  ];
  const check = checkOpenedTab(before, after, requested);
  assert.equal(check.verified, false);
  assert.equal(check.tab?.url, "https://other.example.org/");
});

test("verifies the new tab when it shows the requested site", () => {
  const after: TabSnapshot = [
    { ...before[0], tabs: [...before[0].tabs, tab("https://www.example.com/landing")] },
    before[1],
  ];
  const check = checkOpenedTab(before, after, requested);
  assert.equal(check.verified, true);
  assert.equal(check.tab?.index, 3);
});

test("does not verify when no tab appeared", () => {
  const check = checkOpenedTab(before, before, requested);
  assert.deepEqual(check, { verified: false, reason: "No new tab could be identified." });
});

test("does not verify when the snapshot before opening failed", () => {
  const after: TabSnapshot = [{ ...before[0], tabs: [...before[0].tabs, tab("https://example.com/")] }, before[1]];
  const check = checkOpenedTab(undefined, after, requested);
  assert.equal(check.verified, false);
  assert.match(check.verified ? "" : check.reason, /^Incomplete snapshot: .*before opening/);
});

test("does not verify when the snapshot after opening failed", () => {
  const check = checkOpenedTab(before, undefined, requested);
  assert.equal(check.verified, false);
  assert.match(check.verified ? "" : check.reason, /^Incomplete snapshot: .*after opening/);
});

test("an existing one-tab window missing from an incomplete snapshot is not taken for a new window", () => {
  // getTabSnapshot now throws instead of dropping an unreadable window, so the tool gets no snapshot at all
  const after: TabSnapshot = [...before, { windowRef: 40, windowId: 3, tabs: [tab("https://example.com/old")] }];
  const check = checkOpenedTab(undefined, after, requested);
  assert.equal(check.verified, false);
});

test("an ambiguous window cancels verification even if another window gained a matching tab", () => {
  const dupBefore: TabSnapshot = [...before, { windowRef: 50, windowId: 3, tabs: [tab("https://example.com/")] }];
  const after: TabSnapshot = [
    { ...before[0], tabs: [...before[0].tabs, tab("https://example.com/other")] },
    before[1],
    { windowRef: 50, windowId: 3, tabs: [tab("https://example.com/"), tab("https://example.com/")] },
  ];
  assert.equal(findNewTab(dupBefore, after), undefined);
  assert.equal(checkOpenedTab(dupBefore, after, requested).verified, false);
});

test("a window that gained a tab and also changed cancels verification", () => {
  const after: TabSnapshot = [
    { ...before[0], tabs: [...before[0].tabs, tab("https://example.com/")] },
    { ...before[1], tabs: [tab("https://www.raycast.com/store"), tab("https://example.com/x")] },
  ];
  assert.equal(findNewTab(before, after), undefined);
});

test("a new window with several tabs cancels verification", () => {
  const after: TabSnapshot = [
    ...before,
    { windowRef: 60, windowId: 3, tabs: [tab("https://example.com/"), tab("https://a.example/")] },
  ];
  assert.equal(findNewTab(before, after), undefined);
});

test("a new tab still without an address gets its own reason", () => {
  const after: TabSnapshot = [{ ...before[0], tabs: [...before[0].tabs, tab("")] }, before[1]];
  const check = checkOpenedTab(before, after, requested);
  assert.equal(check.verified, false);
  assert.equal(check.verified ? "" : check.reason, "The new tab has no address yet.");
});

test("does not verify when two windows each gained a tab", () => {
  const after: TabSnapshot = [
    { ...before[0], tabs: [...before[0].tabs, tab("https://example.com/")] },
    { ...before[1], tabs: [...before[1].tabs, tab("https://example.com/")] },
  ];
  assert.equal(findNewTab(before, after), undefined);
});

test("does not verify when the new tab has the same URL as its neighbour", () => {
  const dup: TabSnapshot = [{ windowRef: 10, windowId: 1, tabs: [tab("https://example.com/")] }];
  const after: TabSnapshot = [
    { windowRef: 10, windowId: 1, tabs: [tab("https://example.com/"), tab("https://example.com/")] },
  ];
  assert.equal(findNewTab(dup, after), undefined);
});

test("does not verify when an existing tab changed page at the same time", () => {
  const after: TabSnapshot = [
    { ...before[0], tabs: [tab("https://example.com/?t=6"), before[0].tabs[1], tab("https://example.com/")] },
    before[1],
  ];
  assert.equal(findNewTab(before, after), undefined);
});
