// J-1, J-2 (A), J-3, J-4 (A), J-6, J-7 (A), J-8, S-1..S-3, O-4 (A), O-5, H-2..H-4 on fixtures from both projects.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { app, list, sample, win } from "./window/fixtures.ts";
import type { DockRead } from "../src/lib/badge/badge.ts";
import type { SelectedApp } from "../src/lib/badge/config.ts";
import { parseApps } from "../src/lib/badge/helper-output.ts";
import {
  badgeLabel,
  buildRows,
  emptyKind,
  frontBundleId,
  matchAccessory,
  NO_EXPANSION,
  primaryAction,
  rowVisibleIn,
  visibleItems,
  type AppItem,
  type BadgesRead,
  type Expansion,
  type ListConfig,
  type ListItem,
  type WindowsRead,
} from "../src/lib/rows.ts";
import type { ListView } from "../src/lib/badge/views.ts";

// ---------- fixtures ----------

const tracked = (bundleId: string, name: string, path = `/Applications/${name}.app`): SelectedApp => ({ bundleId, path, name });
const MAIL = tracked("com.test.mail", "Mail");
const EDGE = tracked("com.test.microsoft edge", "Microsoft Edge");
const SLACK = tracked("com.test.slack", "Slack");
const CHESS = tracked("com.test.chess", "Chess");
const GONE = tracked("com.test.gone", "Gone", "/nowhere/Gone.app");

const okWindows = (l = sample()): WindowsRead => ({ kind: "ok", list: l, at: 1 });
const failedWindows: WindowsRead = { kind: "failed", failure: { kind: "timeout", detail: "slow" }, at: 1 };
const loadingWindows: WindowsRead = { kind: "loading" };

const dock = (badges: Record<string, string | null>, extra: string[] = []): DockRead => ({
  ok: true,
  apps: [...Object.keys(badges), ...extra].map((id) => ({
    bundleId: id,
    path: `/Applications/${id}.app`,
    title: id,
    running: true,
    badge: badges[id] ?? null,
  })),
});
const okBadges = (read: DockRead): BadgesRead => ({ kind: "done", read, at: 1 });
const failedBadges: BadgesRead = {
  kind: "done",
  read: { ok: false, failure: "permission", reason: "Accessibility access is off for Raycast", diagnostic: "d" },
  at: 1,
};
const loadingBadges: BadgesRead = { kind: "loading" };

const config = (over: Partial<ListConfig> = {}): ListConfig => ({
  apps: [MAIL, EDGE, SLACK, CHESS],
  pins: [MAIL.bundleId, CHESS.bundleId],
  filter: "allApps",
  sort: "alphabetical",
  recent: {},
  ...over,
});
const installed = (path: string) => !path.startsWith("/nowhere");

function items(
  windows: WindowsRead,
  badges: BadgesRead,
  cfg: ListConfig,
  query = "",
  expansion: Expansion = NO_EXPANSION,
): ListItem[] {
  const rows = buildRows(windows, badges, cfg, 0, installed);
  return visibleItems({ rows, config: cfg, query, expansion, windows, badges });
}
const ids = (xs: ListItem[]) => xs.map((x) => x.id);
const apps = (xs: ListItem[]) => xs.filter((x): x is AppItem => x.kind === "app");
const appOf = (xs: ListItem[], name: string) => apps(xs).find((a) => a.row.name === name)!;
const badgeTexts = (xs: ListItem[]) => apps(xs).map((a) => `${a.row.name}:${a.row.badge.kind}`);

// ---------- J rows ----------

describe("J-1 join on fixtures from both projects", () => {
  it("rows keyed by bundle ID carry the right windows and badge; tracked-no-window and untracked-with-window rows exist", () => {
    const rows = buildRows(okWindows(), okBadges(dock({ [MAIL.bundleId]: "2", [SLACK.bundleId]: "•" })), config(), 0, installed);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    assert.deepEqual(byName["Microsoft Edge"].windows.map((w) => w.wid), [104, 101, 102, 103]);
    assert.equal(byName["Microsoft Edge"].tracked, true);
    assert.deepEqual(byName["Mail"].badge, { kind: "numeric", text: "2" });
    assert.equal(byName["Mail"].windows.length, 1);
    assert.equal(byName["Mail"].isHidden, true);
    assert.equal(byName["Slack"].windows.length, 0, "tracked app with no windows still gets a row");
    assert.deepEqual(byName["Slack"].badge, { kind: "nonNumeric", text: "•" });
    assert.equal(byName["Finder"].tracked, false, "untracked app with windows gets a row");
    assert.deepEqual(byName["Finder"].badge, { kind: "notTracked" });
    assert.deepEqual(byName["Chess"].badge, { kind: "notInDock" });
    assert.equal(byName["Mail"].path, "/Applications/Mail.app", "saved path when the helper gives none");
  });

  it("uses the sample helper capture: Mail 2, System Settings 1 (untracked → notTracked)", () => {
    const stdout = readFileSync(join(process.cwd(), "test/fixtures/helper-output-sample.json"), "utf8");
    const read: DockRead = { ok: true, apps: parseApps(stdout)! };
    const mail = tracked("com.apple.mail", "Mail", "/System/Applications/Mail.app");
    const l = list([app(1, "System Settings", { bundleId: "com.apple.systempreferences" })], [win(1, 5, "General", { zIndex: 0 })]);
    const rows = buildRows(okWindows(l), okBadges(read), config({ apps: [mail], pins: [] }), 0, () => true);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    assert.deepEqual(byName["Mail"].badge, { kind: "numeric", text: "2" });
    assert.deepEqual(byName["System Settings"].badge, { kind: "notTracked" });
  });
});

describe("J-2 two pids, one bundle ID (automated half)", () => {
  it("one row, both pids' windows beneath, each window keeps its own pid", () => {
    const l = list(
      [app(10, "Microsoft Edge"), app(11, "Microsoft Edge")],
      [win(10, 101, "First", { zIndex: 1 }), win(11, 111, "Second", { zIndex: 0 })],
    );
    const xs = items(okWindows(l), okBadges(dock({})), config({ apps: [] }));
    assert.deepEqual(ids(xs), ["app:com.test.microsoft edge", "win:11:111", "win:10:101"]);
    const edge = appOf(xs, "Microsoft Edge");
    assert.deepEqual(edge.row.pids, [10, 11]);
    assert.deepEqual(edge.children.map((w) => [w.pid, w.wid]), [[11, 111], [10, 101]]);
  });
  it("an app without a bundle ID is keyed by pid and never shows a badge fact", () => {
    const l = list([app(42, "Agent", { bundleId: undefined })], [win(42, 1, "Panel")]);
    const rows = buildRows(okWindows(l), okBadges(dock({})), config(), 0, installed);
    const agent = rows.find((r) => r.name === "Agent")!;
    assert.equal(agent.key, "pid:42");
    assert.equal(agent.id, "app:pid:42");
    assert.deepEqual(agent.badge, { kind: "notTracked" });
  });
});

describe("J-3 tracked app with no Dock item", () => {
  const badges = okBadges(dock({ [MAIL.bundleId]: null }));
  it("Not in Dock only when tracked and the badge read is ok; hidden in All Apps unless pinned or it has windows", () => {
    const unpinned = config({ apps: [MAIL, SLACK], pins: [] });
    const rows = buildRows(okWindows(list([], [])), badges, unpinned, 0, installed);
    const slack = rows.find((r) => r.name === "Slack")!;
    assert.deepEqual(slack.badge, { kind: "notInDock" });
    assert.equal(rowVisibleIn(slack, "allApps"), false);
    assert.equal(rowVisibleIn(slack, "pinnedAndBadged"), false);
    assert.equal(rowVisibleIn(slack, "badgedOnly"), false);
    const pinned = buildRows(okWindows(list([], [])), badges, config({ apps: [MAIL, SLACK], pins: [SLACK.bundleId] }), 0, installed);
    assert.equal(rowVisibleIn(pinned.find((r) => r.name === "Slack")!, "allApps"), true);
    const running = buildRows(okWindows(), badges, unpinned, 0, installed);
    assert.equal(rowVisibleIn(running.find((r) => r.name === "Mail")!, "allApps"), true, "has a window");
  });
  it("while badges are loading no Not in Dock is shown (state is loading)", () => {
    const rows = buildRows(okWindows(list([], [])), loadingBadges, config(), 0, installed);
    assert.deepEqual(rows.find((r) => r.name === "Slack")!.badge, { kind: "loading" });
  });
});

describe("J-4 pinned app, quit", () => {
  it("shown in All Apps and Pinned + Badged with no windows and its badge state; primary is Open App", () => {
    const xs = items(okWindows(list([], [])), okBadges(dock({ [CHESS.bundleId]: null })), config({ apps: [CHESS], pins: [CHESS.bundleId] }));
    assert.deepEqual(ids(xs), ["app:com.test.chess"]);
    const chess = appOf(xs, "Chess");
    assert.deepEqual(chess.row.badge, { kind: "noBadge" });
    assert.equal(chess.row.windows.length, 0);
    assert.deepEqual(primaryAction(chess), { kind: "open-app", label: "Open App" });
    const pb = items(okWindows(list([], [])), okBadges(dock({ [CHESS.bundleId]: null })), config({ apps: [CHESS], pins: [CHESS.bundleId], filter: "pinnedAndBadged" }));
    assert.deepEqual(ids(pb), ["app:com.test.chess"]);
    const bo = items(okWindows(list([], [])), okBadges(dock({ [CHESS.bundleId]: null })), config({ apps: [CHESS], pins: [CHESS.bundleId], filter: "badgedOnly" }));
    assert.deepEqual(ids(bo), []);
  });
});

describe("J-6 unpinned, unbadged app with windows", () => {
  it("shown in All Apps with no badge fact, hidden in the other two filters, window focusable", () => {
    const cfg = config({ apps: [MAIL], pins: [] });
    const all = items(okWindows(), okBadges(dock({ [MAIL.bundleId]: null })), cfg);
    const finder = appOf(all, "Finder");
    assert.deepEqual(finder.row.badge, { kind: "notTracked" });
    assert.deepEqual(primaryAction(finder), { kind: "switch", window: finder.row.windows[0], label: "Switch to Window" });
    assert.equal(appOf(items(okWindows(), okBadges(dock({})), { ...cfg, filter: "pinnedAndBadged" }), "Finder"), undefined);
    assert.equal(appOf(items(okWindows(), okBadges(dock({})), { ...cfg, filter: "badgedOnly" }), "Finder"), undefined);
  });
});

describe("J-7 badge-bearing tracked app with no windows stays visible in every filter", () => {
  it("All Apps, Pinned + Badged, Badged Only", () => {
    const badges = okBadges(dock({ [SLACK.bundleId]: "•" }));
    for (const filter of ["allApps", "pinnedAndBadged", "badgedOnly"] as ListView[]) {
      const xs = items(okWindows(), badges, config({ pins: [], filter }));
      assert.ok(appOf(xs, "Slack"), filter);
      assert.equal(appOf(xs, "Slack").row.windows.length, 0);
    }
  });
});

describe("J-8 untracked app never shows a badge fact", () => {
  it("notTracked in every read state, so no No badge / Not in Dock text can be rendered for it", () => {
    for (const badges of [loadingBadges, okBadges(dock({ "com.test.finder": null })), failedBadges]) {
      const rows = buildRows(okWindows(), badges, config({ apps: [] }), 0, installed);
      for (const r of rows) assert.deepEqual(r.badge, { kind: "notTracked" });
    }
  });
});

// ---------- S rows ----------

describe("S-1 direct title search", () => {
  it("distinctive fragment → app row with subtitle window, 1 of N matches, one window row, Return focuses that (pid, wid)", () => {
    const xs = items(okWindows(), okBadges(dock({})), config(), "outlook");
    assert.deepEqual(ids(xs), ["app:com.test.microsoft edge", "win:10:101"]);
    const edge = appOf(xs, "Microsoft Edge");
    assert.equal(edge.match.kind, "single");
    assert.equal(matchAccessory(edge), "1 of 4 matches");
    const p = primaryAction(edge);
    assert.ok(p.kind === "switch" && p.window.pid === 10 && p.window.wid === 101);
  });
  it("a single-match on a one-window app shows no match accessory", () => {
    const xs = items(okWindows(), okBadges(dock({})), config(), "downloads");
    assert.deepEqual(ids(xs), ["app:com.test.finder", "win:20:201"]);
    assert.equal(matchAccessory(appOf(xs, "Finder")), undefined);
  });
});

describe("S-2 app-name search does not flood", () => {
  it("edge → one Edge row, no window rows, Return expands (Show Windows)", () => {
    const xs = items(okWindows(), okBadges(dock({})), config(), "edge");
    assert.deepEqual(ids(xs), ["app:com.test.microsoft edge"]);
    const edge = appOf(xs, "Microsoft Edge");
    assert.equal(edge.match.kind, "name");
    assert.equal(edge.collapsed, true);
    assert.deepEqual(primaryAction(edge), { kind: "show-windows", label: "Show Windows" });
    assert.equal(matchAccessory(edge), undefined);
  });
  it("Show Windows during the search lists all windows beneath; Return then switches to the first listed", () => {
    const e: Expansion = { ...NO_EXPANSION, expanded: new Set(["com.test.microsoft edge"]) };
    const xs = items(okWindows(), okBadges(dock({})), config(), "edge", e);
    assert.deepEqual(ids(xs), ["app:com.test.microsoft edge", "win:10:104", "win:10:101", "win:10:102", "win:10:103"]);
    const p = primaryAction(appOf(xs, "Microsoft Edge"));
    assert.ok(p.kind === "switch" && p.window.wid === 104 && p.label === "Switch to “Raycast Store - Microsoft Edge”");
  });
  it("name match plus a token in a title lists only the matching windows", () => {
    const xs = items(okWindows(), okBadges(dock({})), config(), "edge budget");
    assert.deepEqual(ids(xs), ["app:com.test.microsoft edge", "win:10:102", "win:10:103"]);
  });
  it("a one-window app matched by name switches directly; a tracked app with no window matches by name only", () => {
    const xs = items(okWindows(), okBadges(dock({ [SLACK.bundleId]: "•" })), config(), "sla");
    assert.deepEqual(ids(xs), ["app:com.test.slack"]);
    assert.deepEqual(primaryAction(appOf(xs, "Slack")), { kind: "open-app", label: "Open App" });
    const finder = appOf(items(okWindows(), okBadges(dock({})), config(), "find"), "Finder");
    assert.equal(primaryAction(finder).kind, "switch");
  });
});

describe("S-3 duplicate titles and multi-app matches", () => {
  it("identical titles give 2 of N match, numbered, never a silent pick", () => {
    const l = list([app(1, "Edge")], [win(1, 5, "Same", { zIndex: 0 }), win(1, 9, "Same", { zIndex: 1 }), win(1, 7, "Other", { zIndex: 2 })]);
    const xs = items(okWindows(l), okBadges(dock({})), config({ apps: [] }), "same");
    assert.deepEqual(ids(xs), ["app:com.test.edge", "win:1:5", "win:1:9"]);
    const edge = appOf(xs, "Edge");
    assert.equal(matchAccessory(edge), "2 of 3 match");
    assert.deepEqual(edge.children.map((w) => w.duplicate), [
      { index: 1, count: 2 },
      { index: 2, count: 2 },
    ]);
    const p = primaryAction(edge);
    assert.ok(p.kind === "switch" && p.window.wid === 5 && p.label === "Switch to “Same”");
  });
  it("a fragment matching windows in several apps yields one app row per app with its matches beneath", () => {
    const l = list(
      [app(1, "Edge"), app(2, "Safari")],
      [win(1, 5, "Budget A"), win(1, 6, "Budget B"), win(2, 7, "Budget C"), win(2, 8, "News")],
    );
    const xs = items(okWindows(l), okBadges(dock({})), config({ apps: [] }), "budget");
    assert.deepEqual(ids(xs), ["app:com.test.edge", "win:1:5", "win:1:6", "app:com.test.safari", "win:2:7"]);
    assert.equal(matchAccessory(appOf(xs, "Safari")), "1 of 2 matches");
  });
  it("no match → no rows and the no-match empty view", () => {
    const cfg = config();
    const xs = items(okWindows(), okBadges(dock({})), cfg, "zzz");
    assert.deepEqual(xs, []);
    assert.equal(
      emptyKind({ rows: [], config: cfg, query: "zzz", expansion: NO_EXPANSION, windows: okWindows(), badges: okBadges(dock({})) }, 0),
      "no-match",
    );
  });
});

// ---------- Inline rows (§7) and collapse ----------

describe("inline window rows", () => {
  it("multi-window apps list their windows beneath by default; one-window apps have no child; collapse hides them", () => {
    const xs = items(okWindows(), okBadges(dock({})), config({ apps: [] }));
    assert.deepEqual(ids(xs), ["app:com.test.finder", "app:com.test.mail", "app:com.test.microsoft edge", "win:10:104", "win:10:101", "win:10:102", "win:10:103"]);
    const collapsed: Expansion = { expandByDefault: true, expanded: new Set(), collapsed: new Set(["com.test.microsoft edge"]) };
    const ys = items(okWindows(), okBadges(dock({})), config({ apps: [] }), "", collapsed);
    assert.deepEqual(ids(ys), ["app:com.test.finder", "app:com.test.mail", "app:com.test.microsoft edge"]);
    assert.equal(appOf(ys, "Microsoft Edge").collapsed, true);
    assert.deepEqual(primaryAction(appOf(ys, "Microsoft Edge")), { kind: "show-windows", label: "Show Windows" });
    const compact: Expansion = { expandByDefault: false, expanded: new Set(), collapsed: new Set() };
    assert.deepEqual(ids(items(okWindows(), okBadges(dock({})), config({ apps: [] }), "", compact)), ids(ys));
    const reopened: Expansion = { ...compact, expanded: new Set(["com.test.microsoft edge"]) };
    assert.deepEqual(ids(items(okWindows(), okBadges(dock({})), config({ apps: [] }), "", reopened)), ids(xs));
  });
  it("Return on an expanded multi-window app switches to its first listed window and the label names it", () => {
    const xs = items(okWindows(), okBadges(dock({})), config({ apps: [] }));
    const p = primaryAction(appOf(xs, "Microsoft Edge"));
    assert.ok(p.kind === "switch" && p.window.wid === 104 && p.label === "Switch to “Raycast Store - Microsoft Edge”");
  });
});

// ---------- O rows ----------

describe("O-4 badge refresh never reorders (automated half)", () => {
  it("identical order in every filter whether badges are loading, ok, or failed", () => {
    for (const filter of ["allApps", "pinnedAndBadged", "badgedOnly"] as ListView[]) {
      const cfg = config({ filter, pins: [MAIL.bundleId, EDGE.bundleId, SLACK.bundleId, CHESS.bundleId] });
      const before = ids(items(okWindows(), okBadges(dock({ [MAIL.bundleId]: "1", [SLACK.bundleId]: "•", [EDGE.bundleId]: "9" })), cfg));
      const after = ids(items(okWindows(), okBadges(dock({ [MAIL.bundleId]: "5", [SLACK.bundleId]: "•", [EDGE.bundleId]: "9" })), cfg));
      assert.deepEqual(after, before, filter);
    }
  });
});

describe("O-5 Pinned + Badged and Badged Only ignore the sort setting", () => {
  it("tracked order, pinned and unpinned interleaved, under both sort modes", () => {
    const badges = okBadges(dock({ [SLACK.bundleId]: "•", [MAIL.bundleId]: "3", [EDGE.bundleId]: "1" }));
    const recent = { [SLACK.bundleId]: { switchedAt: 99 } };
    for (const filter of ["pinnedAndBadged", "badgedOnly"] as ListView[]) {
      const a = ids(items(okWindows(), badges, config({ filter, sort: "alphabetical", pins: [CHESS.bundleId] })));
      const r = ids(items(okWindows(), badges, config({ filter, sort: "recent", recent, pins: [CHESS.bundleId] })));
      assert.deepEqual(a, r, filter);
      assert.deepEqual(
        apps(items(okWindows(), badges, config({ filter, sort: "recent", recent }))).map((x) => x.row.name),
        filter === "badgedOnly" ? ["Mail", "Microsoft Edge", "Slack"] : ["Mail", "Microsoft Edge", "Slack", "Chess"],
      );
    }
    const all = apps(items(okWindows(), badges, config({ filter: "allApps", sort: "recent", recent, apps: [SLACK], pins: [] })));
    assert.equal(all[0].row.name, "Slack", "All Apps does apply Recent");
  });
});

describe("frontBundleId", () => {
  it("is the owner of the on-screen zIndex 0 window, undefined otherwise", () => {
    assert.equal(frontBundleId(sample()), "com.test.microsoft edge");
    assert.equal(frontBundleId(list([app(1, "A")], [win(1, 1, "x", { zIndex: 3 })])), undefined);
  });
});

// ---------- H rows ----------

describe("H-2 window helper failed, badge ok", () => {
  it("every tracked row shown with windows unknown; status row first; badges shown; Badged Only unaffected", () => {
    const badges = okBadges(dock({ [MAIL.bundleId]: "2" }));
    const xs = items(failedWindows, badges, config({ pins: [] }));
    assert.equal(xs[0].id, "status:windows");
    assert.deepEqual(badgeTexts(xs), ["Chess:notInDock", "Mail:numeric", "Microsoft Edge:notInDock", "Slack:notInDock"]);
    for (const a of apps(xs)) assert.equal(a.row.windowsState, "failed");
    for (const a of apps(xs)) assert.notEqual(primaryAction(a).kind, "switch");
    const bo = items(failedWindows, badges, config({ filter: "badgedOnly" }));
    assert.deepEqual(ids(bo), ["status:windows", "app:com.test.mail"]);
  });
  it("no untracked rows can be listed; empty All Apps with no tracked apps uses the windows-failed view", () => {
    const cfg = config({ apps: [] });
    const xs = items(failedWindows, okBadges(dock({})), cfg);
    assert.deepEqual(xs, []);
    assert.equal(emptyKind({ rows: [], config: cfg, query: "", expansion: NO_EXPANSION, windows: failedWindows, badges: okBadges(dock({})) }, 0), "windows-failed");
  });
});

describe("H-3 badge helper failed, window ok", () => {
  it("apps with windows shown; tracked rows unavailable; status row; windows still switchable; Badged Only → failure view", () => {
    const xs = items(okWindows(), failedBadges, config({ pins: [] }));
    assert.equal(xs[0].id, "status:badges");
    assert.deepEqual(badgeTexts(xs), ["Chess:unavailable", "Finder:notTracked", "Mail:unavailable", "Microsoft Edge:unavailable", "Slack:unavailable"]);
    assert.equal(primaryAction(appOf(xs, "Finder")).kind, "switch");
    const bo = items(okWindows(), failedBadges, config({ filter: "badgedOnly" }));
    assert.deepEqual(bo, []);
    assert.equal(emptyKind({ rows: [], config: config({ filter: "badgedOnly" }), query: "", expansion: NO_EXPANSION, windows: okWindows(), badges: failedBadges }, 0), "failed");
    const pb = items(okWindows(), failedBadges, config({ filter: "pinnedAndBadged", pins: [] }));
    assert.deepEqual(badgeTexts(pb), ["Mail:unavailable", "Microsoft Edge:unavailable", "Slack:unavailable", "Chess:unavailable"]);
  });
});

describe("H-4 both failed", () => {
  it("tracked rows with both unknown markers; two status rows; no No windows / No badge fact anywhere", () => {
    const xs = items(failedWindows, failedBadges, config({ pins: [] }));
    assert.deepEqual(ids(xs).slice(0, 2), ["status:windows", "status:badges"]);
    for (const a of apps(xs)) {
      assert.equal(a.row.windowsState, "failed");
      assert.equal(a.row.badge.kind, "unavailable");
      assert.notEqual(a.row.badge.kind, "noBadge");
    }
    assert.equal(apps(xs).length, 4);
    const cfg = config({ apps: [] });
    assert.equal(emptyKind({ rows: [], config: cfg, query: "", expansion: NO_EXPANSION, windows: failedWindows, badges: failedBadges }, 0), "both-failed");
  });
});

describe("truth table §6.2: what the list shows while reads are in flight", () => {
  it("config ready, both running: pinned tracked apps only, in loading state, no status rows", () => {
    const xs = items(loadingWindows, loadingBadges, config());
    assert.deepEqual(badgeTexts(xs), ["Chess:loading", "Mail:loading"]);
    assert.equal(xs.some((x) => x.kind === "status"), false);
    assert.equal(appOf(xs, "Mail").row.windowsState, "loading");
  });
  it("windows ok, badges running: apps with windows plus pinned apps, tracked rows without a badge fact yet", () => {
    const xs = items(okWindows(), loadingBadges, config());
    assert.deepEqual(badgeTexts(xs), ["Chess:loading", "Finder:notTracked", "Mail:loading", "Microsoft Edge:loading"]);
  });
  it("windows running, badges ok: pinned + badged tracked apps with badge accessories, no window facts", () => {
    const xs = items(loadingWindows, okBadges(dock({ [SLACK.bundleId]: "•" })), config());
    assert.deepEqual(badgeTexts(xs), ["Chess:notInDock", "Mail:notInDock", "Slack:nonNumeric"]);
  });
  it("reading empty view while anything loads; nothing view when both ok and nothing to show", () => {
    const cfg = config({ apps: [] });
    assert.equal(emptyKind({ rows: [], config: cfg, query: "", expansion: NO_EXPANSION, windows: loadingWindows, badges: okBadges(dock({})) }, 0), "reading");
    assert.equal(emptyKind({ rows: [], config: cfg, query: "", expansion: NO_EXPANSION, windows: okWindows(list([], [])), badges: okBadges(dock({})) }, 0), "nothing");
    assert.equal(emptyKind({ rows: [], config: config({ apps: [], filter: "pinnedAndBadged" }), query: "", expansion: NO_EXPANSION, windows: okWindows(), badges: okBadges(dock({})) }, 0), "no-apps-configured");
  });
});

describe("§4.4 visibility cases", () => {
  const cases: Array<[string, string[], Record<ListView, boolean>]> = [
    ["tracked app whose saved path is gone: shown only if pinned", [GONE.bundleId], { allApps: true, pinnedAndBadged: true, badgedOnly: false }],
    ["same app unpinned: hidden everywhere", [], { allApps: false, pinnedAndBadged: false, badgedOnly: false }],
  ];
  for (const [name, pins, expected] of cases) {
    it(name, () => {
      const rows = buildRows(okWindows(list([], [])), okBadges(dock({})), config({ apps: [GONE], pins }), 0, installed);
      assert.deepEqual(rows[0].badge, { kind: "notInstalled" });
      for (const filter of Object.keys(expected) as ListView[]) {
        assert.equal(rowVisibleIn(rows[0], filter), expected[filter], `${name} / ${filter}`);
      }
    });
  }
});

describe("badgeLabel: ten or more is a dot, everything else verbatim", () => {
  it("caps only numeric values of ten or more", () => {
    for (const v of ["1", "9", "0", "•", "99+", "1,204", "New", " 3", "00"]) assert.equal(badgeLabel(v), v);
    for (const v of ["10", "27", "100", "1204"]) assert.equal(badgeLabel(v), "•");
  });
});
