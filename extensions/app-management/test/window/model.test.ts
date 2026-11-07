// Copied from raycast-window-switcher test/model.test.ts on 2026-09-30, unchanged except this header and import paths
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildApps,
  childWindows,
  rootPrimary,
  rootRows,
  rootSubtitle,
  TITLE_UNAVAILABLE,
  UNTITLED,
} from "../../src/lib/window/model.ts";
import { app, list, sample, win } from "./fixtures.ts";

test("A-1 groups windows into apps with counts", () => {
  const apps = buildApps(sample(), 0);
  assert.deepEqual(
    apps.map((a) => [a.name, a.windows.length, a.minimizedCount, a.isHidden]),
    [
      ["Finder", 1, 0, false],
      ["Mail", 1, 1, true],
      ["Microsoft Edge", 4, 1, false],
    ],
  );
});

test("A-2 one-window app focuses; multi-window app opens the child list", () => {
  const apps = buildApps(sample(), 0);
  const rows = rootRows(apps, "");
  const finder = rows.find((r) => r.app.name === "Finder")!;
  const edge = rows.find((r) => r.app.name === "Microsoft Edge")!;
  assert.equal(rootPrimary(finder, "").kind, "focus");
  assert.deepEqual(rootPrimary(edge, ""), { kind: "open-child", prefill: "" });
  assert.equal(rootSubtitle(finder), "Downloads");
  assert.equal(rootSubtitle(edge), undefined);
});

test("A-3 search: app-name match shows the app and opens an unfiltered child", () => {
  const rows = rootRows(buildApps(sample(), 0), "edge");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "app");
  assert.deepEqual(rootPrimary(rows[0], "edge"), { kind: "open-child", prefill: "" });
});

test("A-3 search: exactly one title match focuses that window from the root", () => {
  const rows = rootRows(buildApps(sample(), 0), "outlook");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "single-match");
  const primary = rootPrimary(rows[0], "outlook");
  assert.ok(primary.kind === "focus" && primary.window.wid === 101);
  assert.equal(rootSubtitle(rows[0]), "Inbox - Outlook - Microsoft Edge");
});

test("A-3 search: several title matches open the child pre-filtered", () => {
  const apps = buildApps(sample(), 0);
  const rows = rootRows(apps, "budget");
  assert.equal(rows.length, 1);
  assert.ok(rows[0].kind === "multi-match" && rows[0].matches.length === 2);
  assert.deepEqual(rootPrimary(rows[0], " budget "), { kind: "open-child", prefill: "budget" });
  assert.equal(rootSubtitle(rows[0]), undefined);
  const edge = apps.find((a) => a.name === "Microsoft Edge")!;
  assert.deepEqual(
    childWindows(edge, "budget").map((w) => w.wid),
    [102, 103],
  );
});

test("A-3 search: tokens may span app name and title; no match gives no rows", () => {
  const rows = rootRows(buildApps(sample(), 0), "microsoft raycast");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "single-match");
  assert.equal(rootRows(buildApps(sample(), 0), "zzz").length, 0);
});

test("A-4 duplicate titles are numbered and stable when an unrelated window is added", () => {
  const base = list(
    [app(1, "Edge")],
    [win(1, 5, "Same", { zIndex: 0 }), win(1, 9, "Same", { zIndex: 1 }), win(1, 7, "Other", { zIndex: 2 })],
  );
  const dup = (l: typeof base) =>
    buildApps(l, 0)[0]
      .windows.filter((w) => w.title === "Same")
      .map((w) => [w.wid, w.duplicate?.index, w.duplicate?.count]);
  assert.deepEqual(dup(base), [
    [5, 1, 2],
    [9, 2, 2],
  ]);
  base.windows.push(win(1, 3, "Unrelated", { onScreen: false, spaceIds: [5] }));
  assert.deepEqual(dup(base), [
    [5, 1, 2],
    [9, 2, 2],
  ]);
  assert.equal(buildApps(base, 0)[0].windows.find((w) => w.wid === 7)!.duplicate, undefined);
});

test("A-5 ordering: apps by name; windows on-screen by z-order, then off-screen, minimized, unresolved", () => {
  const l = sample();
  l.windows.push(win(10, 105, "", { resolved: false, titleSource: "none", onScreen: false, spaceIds: [5] }));
  const edge = buildApps(l, 0).find((a) => a.name === "Microsoft Edge")!;
  assert.deepEqual(
    edge.windows.map((w) => w.wid),
    [104, 101, 102, 103, 105],
  );
  const again = buildApps(structuredClone(l), 0).find((a) => a.name === "Microsoft Edge")!;
  assert.deepEqual(
    again.windows.map((w) => w.key),
    edge.windows.map((w) => w.key),
  );
});

test("display titles for empty and unresolved windows", () => {
  const l = list([app(1, "X")], [win(1, 1, ""), win(1, 2, "", { resolved: false, titleSource: "none" })]);
  assert.deepEqual(
    buildApps(l, 0)[0].windows.map((w) => w.title),
    [UNTITLED, TITLE_UNAVAILABLE],
  );
});

test("A-7 Desktop labels: off at tier 0; tier 1 only for single non-visible Space, never for minimized", () => {
  const off = buildApps(sample(), 0).find((a) => a.name === "Microsoft Edge")!;
  assert.equal(off.otherDesktopCount, 0);
  const on = buildApps(sample(), 1).find((a) => a.name === "Microsoft Edge")!;
  assert.deepEqual(
    on.windows.filter((w) => w.otherDesktop).map((w) => w.wid),
    [102],
  );
  const noSpaces = sample();
  noSpaces.spaces.available = false;
  assert.equal(buildApps(noSpaces, 1).find((a) => a.name === "Microsoft Edge")!.otherDesktopCount, 0);
});

test("hidden and minimized windows are never dropped", () => {
  const apps = buildApps(sample(), 0);
  const total = apps.reduce((n, a) => n + a.windows.length, 0);
  assert.equal(total, sample().windows.length);
});
