import assert from "node:assert/strict";
import test from "node:test";
import type { AppWindowData } from "../src/app-window-evidence";
import type { AppGroup, AXWindow, Window } from "../src/windows";
import createLoader from "./load-ts.ts";

const load = createLoader({ "@raycast/api": { Icon: {} } });
const { getAppWindowEvidence } = load("src/app-window-evidence.ts") as typeof import("../src/app-window-evidence");
const { getAppRow } = load("src/app-row.ts") as typeof import("../src/app-row");
const { groupApplicationsBySpace } = load("src/app-space-groups.ts") as typeof import("../src/app-space-groups");
const { searchApplications } = load("src/search-results.ts") as typeof import("../src/search-results");
const emptyData = (): AppWindowData => ({ browserTabs: {}, browserCounts: {}, axWindowsByPid: {} });
const native = (id: number, pid: number, title = "Project"): Window => ({
  id,
  pid,
  app: "Editor",
  title,
  space: 1,
  frame: { x: 0, y: 0, w: 600, h: 400 },
});
const ax = (pid: number, index: number, subrole = "AXStandardWindow"): AXWindow => ({
  pid,
  index,
  title: "Project",
  subrole,
  space: 1,
});

test("row, Space arrangement and search share unknown, failed, resolved and empty AX evidence", () => {
  const app: AppGroup = { id: "editor", name: "Editor", pids: [3], windows: [] };
  const data = emptyData();
  const check = (kind: string, section: string, hits: number) => {
    assert.equal(getAppRow(app, data).target.kind, kind);
    assert.equal(groupApplicationsBySpace([app], data)[0].title, section);
    assert.equal(searchApplications([app], "project", data.browserTabs, data.axWindowsByPid).length, hits);
  };
  check("application", "Unknown Space", 0);
  assert.equal(getAppWindowEvidence(app, data).accessibility.resolved, false);
  data.axWindowsByPid[3] = null;
  check("application", "Unknown Space", 0);
  assert.equal(getAppWindowEvidence(app, data).accessibility.resolved, false);
  const target = ax(3, 1);
  data.axWindowsByPid[3] = [target];
  check("ax-window", "Space 1", 1);
  const row = getAppRow(app, data);
  assert.equal(row.target.kind, "ax-window");
  if (row.target.kind !== "ax-window") assert.fail("expected the original AX target");
  assert.equal(row.target.window, target);
  data.axWindowsByPid[3] = [];
  check("application", "Unknown Space", 0);
  assert.equal(getAppWindowEvidence(app, data).accessibility.resolved, true);
});

test("mixed native and AX evidence preserves ordering and distinct process/subrole targets", () => {
  const direct = native(10, 3);
  const otherProcess = native(20, 4, "Project other process");
  const lateDirect = native(11, 3, "Project later");
  const fallback = { ...native(12, 3, "Unreadable"), "has-ax-reference": false };
  const app: AppGroup = {
    id: "editor",
    name: "Editor",
    pids: [3, 4],
    windows: [direct, otherProcess, lateDirect, fallback],
  };
  const data = emptyData();
  const dialog = ax(3, 2, "AXDialog");
  const otherAX = ax(4, 1);
  data.axWindowsByPid = { 3: [ax(3, 1), dialog], 4: [otherAX] };
  const evidence = getAppWindowEvidence(app, data);
  assert.deepEqual(evidence.directWindows, [direct, otherProcess, lateDirect]);
  assert.deepEqual(evidence.accessibility.searchWindows, [dialog, otherAX]);
  assert.equal(evidence.accessibility.searchWindows[0], dialog);
  assert.equal(evidence.accessibility.searchWindows[1], otherAX);
  assert.equal(evidence.accessibility.isOnlySource, false);
  const hits = searchApplications([app], "project", data.browserTabs, data.axWindowsByPid);
  assert.deepEqual(
    hits.filter((hit) => hit.kind === "window").map((hit) => hit.id),
    ["window:3:10", "window:4:20", "window:3:11"],
  );
  assert.deepEqual(
    hits.filter((hit) => hit.kind === "ax-window").map((hit) => hit.id),
    ['ax:3:[2,"Project","AXDialog"]', 'ax:4:[1,"Project","AXStandardWindow"]'],
  );
});

test("companion-only and partial browser observations keep native and companion identities distinct", () => {
  const nativeWindow = { ...native(10, 3), app: "Firefox", space: 2 };
  const app: AppGroup = { id: "firefox", name: "Firefox", pids: [3], windows: [nativeWindow] };
  const data = emptyData();
  const companion = { id: "session:1", title: "Work", tabs: [{ id: "session:11", title: "Docs", url: "" }] };
  data.browserTabs.firefox = [companion];
  const evidence = getAppWindowEvidence(app, data);
  assert.equal(evidence.browser?.snapshot.windows?.[0], companion);
  assert.deepEqual(evidence.windowSpaces, [undefined]);
  assert.equal(groupApplicationsBySpace([app], data)[0].title, "Unknown Space");
  const row = getAppRow(app, data);
  assert.equal(row.target.kind, "browser");
  if (row.target.kind !== "browser") assert.fail("expected browser navigation");
  assert.equal(row.target.snapshot.windows?.[0], companion);
  const hits = searchApplications([app], "docs", data.browserTabs, data.axWindowsByPid);
  assert.equal(hits[0].kind, "tab");
  if (hits[0].kind !== "tab") assert.fail("expected a companion tab");
  assert.equal(hits[0].window.id, "session:1");
  assert.equal(hits[0].tab.id, "session:11");

  data.browserTabs.firefox = [{ ...companion, nativeWindowId: "10", space: 2 }];
  data.browserCounts.firefox = { windows: 2 };
  assert.deepEqual(getAppWindowEvidence(app, data).windowSpaces, [2, undefined]);
  assert.equal(groupApplicationsBySpace([app], data)[0].title, "Unknown Space");
  data.browserTabs.firefox = [];
  data.browserCounts.firefox = { windows: 0 };
  assert.deepEqual(getAppWindowEvidence(app, data).windowSpaces, []);
  assert.equal(getAppRow(app, data).target.kind, "application");
});
