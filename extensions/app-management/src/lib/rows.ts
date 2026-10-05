// The join, visibility, search, inline grouping, status rows, and primary action (SPEC.md §4, §5.1, §6.2, §6.3, §7).
// Pure: no Raycast or Node imports, so every rule here is unit-tested with fixtures from both source projects.
import type { Failure, WindowList } from "./window/protocol.ts";
import {
  compareWindows,
  displayTitle,
  isOtherDesktop,
  numberDuplicates,
  tokens,
  windowGroup,
  type LabelTier,
  type WindowView,
} from "./window/model.ts";
import { rowState, type DockRead, type RowState } from "./badge/badge.ts";
import type { SelectedApp } from "./badge/config.ts";
import { emptyState, isBadged, rowVisible, type EmptyState, type ListView } from "./badge/views.ts";
import { sortRows, type RecentMap, type SortMode } from "./sort.ts";

// ---------- Inputs (SPEC.md §6.1) ----------

export type WindowsRead =
  { kind: "loading" } | { kind: "ok"; list: WindowList; at: number } | { kind: "failed"; failure: Failure; at: number };

export type BadgesRead = { kind: "loading" } | { kind: "done"; read: DockRead; at: number };

export interface ListConfig {
  apps: SelectedApp[];
  pins: string[];
  filter: ListView;
  sort: SortMode;
  recent: RecentMap;
}

/** Badge fact for a row: the badge project's states for tracked apps; untracked apps never get a badge fact. */
export type BadgeFact = RowState | { kind: "notTracked" };

export interface AppRow {
  id: string;
  key: string;
  name: string;
  bundleId?: string;
  /** Window helper bundlePath when running, else the tracked app's saved path (§5.1). */
  path?: string;
  /** Running instances that share this key; empty when the app has no discovered windows. */
  pids: number[];
  isHidden: boolean;
  windows: WindowView[];
  windowsState: WindowsRead["kind"];
  minimizedCount: number;
  otherDesktopCount: number;
  unresolvedCount: number;
  warnings: string[];
  tracked: boolean;
  trackedIndex: number;
  pinned: boolean;
  badge: BadgeFact;
  /** Smallest zIndex among on-screen windows, for the Recent order. */
  frontZ?: number;
}

/** The helper's warning codes in plain words. `ax-budget`: a WindowServer window the app hides from Accessibility was
 * not identified within the remote-token budget, so it may be missing from the list (usually an off-screen surface). */
export function plainWarning(w: { code: string; message: string }): string {
  const m = /^(\d+) window\(s\) not resolved within (\d+) ms$/.exec(w.message);
  if (w.code === "ax-budget" && m) {
    return `${m[1]} window${m[1] === "1" ? "" : "s"} of this app could not be identified within the helper's ${m[2]} ms budget and may be missing from the list`;
  }
  return w.message;
}

/** Owner revision (2026-09-30): a numeric Dock badge of ten or more is shown as a dot, "a lot", and the exact value
 * stays in the tooltip and in Copy Diagnostic Info. Other values are shown verbatim. */
export function badgeLabel(text: string): string {
  return /^[0-9]+$/.test(text) && Number(text) >= 10 ? "•" : text;
}

export const appKeyOf = (bundleId: string | undefined, pid: number): string => bundleId ?? `pid:${pid}`;
export const appId = (key: string) => `app:${key}`;
export const windowId = (pid: number, wid: number) => `win:${pid}:${wid}`;

/** SPEC.md §5.1: rows keyed by bundle ID (all pids of one bundle in one row), pid-keyed when there is no bundle ID. */
export function buildRows(
  windows: WindowsRead,
  badges: BadgesRead,
  config: ListConfig,
  tier: LabelTier,
  isInstalled: (path: string) => boolean,
): AppRow[] {
  const rows = new Map<string, AppRow>();
  const read: DockRead | undefined = badges.kind === "done" ? badges.read : undefined;

  const blank = (key: string, name: string, bundleId?: string): AppRow => ({
    id: appId(key),
    key,
    name,
    bundleId,
    pids: [],
    isHidden: false,
    windows: [],
    windowsState: windows.kind,
    minimizedCount: 0,
    otherDesktopCount: 0,
    unresolvedCount: 0,
    warnings: [],
    tracked: false,
    trackedIndex: -1,
    pinned: false,
    badge: { kind: "notTracked" },
  });

  if (windows.kind === "ok") {
    const list = windows.list;
    const appsByPid = new Map(list.apps.map((a) => [a.pid, a]));
    for (const app of list.apps) {
      const key = appKeyOf(app.bundleId, app.pid);
      const row = rows.get(key) ?? blank(key, app.name, app.bundleId);
      row.pids.push(app.pid);
      row.isHidden = row.isHidden || app.isHidden;
      if (!row.path && app.bundlePath) row.path = app.bundlePath;
      // The helper's ax-budget note (a hidden surface not identified within 250 ms) is dropped from the row on the
      // owner's decision: it appears on every press for some browsers and changes nothing the user can act on. It stays
      // in the raw helper output that Copy Diagnostic Info includes.
      row.warnings.push(
        ...list.warnings.filter((w) => w.pid === app.pid && w.code !== "ax-budget").map((w) => plainWarning(w)),
      );
      rows.set(key, row);
    }
    for (const w of list.windows) {
      const app = appsByPid.get(w.pid);
      if (!app) continue;
      const row = rows.get(appKeyOf(app.bundleId, app.pid))!;
      row.windows.push({
        key: windowId(w.pid, w.wid),
        pid: w.pid,
        wid: w.wid,
        appName: app.name,
        bundleId: app.bundleId,
        rawTitle: w.title,
        title: displayTitle(w),
        isMinimized: w.isMinimized,
        isFullscreen: w.isFullscreen,
        appHidden: app.isHidden,
        resolved: w.resolved,
        otherDesktop: isOtherDesktop(w, list, tier),
        group: windowGroup(w),
        zIndex: w.zIndex,
      });
    }
    // Apps that reported no window are dropped unless configuration brings them back below (§4.4: untracked apps
    // with no discovered window are never shown). Keeping them would also make "Quit" appear for windowless agents.
    for (const [key, row] of rows) if (row.windows.length === 0) rows.delete(key);
    for (const row of rows.values()) {
      row.windows.sort(compareWindows);
      numberDuplicates(row.windows);
      row.minimizedCount = row.windows.filter((w) => w.isMinimized).length;
      row.otherDesktopCount = row.windows.filter((w) => w.otherDesktop).length;
      row.unresolvedCount = row.windows.filter((w) => !w.resolved).length;
      const zs = row.windows.filter((w) => w.group === 0 && w.zIndex !== undefined).map((w) => w.zIndex!);
      row.frontZ = zs.length ? Math.min(...zs) : undefined;
    }
  }

  config.apps.forEach((app, index) => {
    const row = rows.get(app.bundleId) ?? blank(app.bundleId, app.name, app.bundleId);
    row.tracked = true;
    row.trackedIndex = index;
    row.pinned = config.pins.includes(app.bundleId);
    if (!row.path) row.path = app.path;
    const installed = row.path !== undefined && isInstalled(row.path);
    row.badge = rowState({ bundleId: app.bundleId, path: app.path }, installed, read);
    rows.set(app.bundleId, row);
  });

  return [...rows.values()];
}

// ---------- Visibility (SPEC.md §4.4) ----------

/** The badge project's rule over the tracked half; `notTracked` rows are only ever visible through their windows. */
function trackedVisible(row: AppRow, filter: "pinnedAndBadged" | "badgedOnly"): boolean {
  if (!row.tracked || row.badge.kind === "notTracked") return false;
  return rowVisible(row.badge, row.pinned, filter);
}

export function rowVisibleIn(row: AppRow, filter: ListView): boolean {
  if (filter === "badgedOnly") return trackedVisible(row, "badgedOnly");
  if (filter === "pinnedAndBadged") return trackedVisible(row, "pinnedAndBadged");
  if (row.windowsState === "ok" && row.windows.length > 0) return true;
  if (!row.tracked) return false;
  // Unknown never hides a tracked app; otherwise pinned, badged, or badge-unavailable.
  return row.windowsState === "failed" || trackedVisible(row, "pinnedAndBadged");
}

// ---------- Search (SPEC.md §4.5) ----------

export type Match =
  | { kind: "none" }
  | { kind: "name" }
  | { kind: "single"; window: WindowView }
  | { kind: "multi"; matches: WindowView[] };

const includesAll = (haystack: string, ts: string[]) => {
  const h = haystack.toLocaleLowerCase();
  return ts.every((t) => h.includes(t));
};
/** Returns undefined when the row does not match at all. */
export function matchRow(row: AppRow, ts: string[]): Match | undefined {
  if (ts.length === 0) return { kind: "none" };
  if (includesAll(row.name, ts)) return { kind: "name" };
  const matches = row.windows.filter((w) => includesAll(`${row.name} ${w.title}`, ts));
  if (matches.length === 1) return { kind: "single", window: matches[0] };
  if (matches.length > 1) return { kind: "multi", matches };
  return undefined;
}

// ---------- Flat list with inline window rows (SPEC.md §7) ----------

export interface Expansion {
  expandByDefault: boolean;
  /** Keys explicitly expanded by Show Windows / Expand Windows; wins during a search too (§4.5 "explicit choice"). */
  expanded: ReadonlySet<string>;
  collapsed: ReadonlySet<string>;
}

export const NO_EXPANSION: Expansion = { expandByDefault: true, expanded: new Set(), collapsed: new Set() };

export type StatusItem = { kind: "status"; id: "status:windows" | "status:badges" };
export type AppItem = {
  kind: "app";
  id: string;
  row: AppRow;
  match: Match;
  /** Window rows rendered directly beneath this row, in group order. */
  children: WindowView[];
  /** True when the app has 2+ windows and none are shown beneath it (▸ accessory, Show Windows / Expand Windows). */
  collapsed: boolean;
};
export type WindowItem = { kind: "window"; id: string; row: AppRow; window: WindowView };
export type ListItem = StatusItem | AppItem | WindowItem;

export function isExpanded(key: string, e: Expansion): boolean {
  if (e.expanded.has(key)) return true;
  if (e.collapsed.has(key)) return false;
  return e.expandByDefault;
}

function childrenOf(row: AppRow, match: Match, ts: string[], e: Expansion): WindowView[] {
  switch (match.kind) {
    case "single":
      return [match.window];
    case "multi":
      return match.matches;
    case "name":
      // S-2: an app-name match never floods (Edge's titles all contain "Edge"); only the explicit Show Windows expands.
      // A query with a token that is not in the app name is not a name match, so it reaches single/multi above.
      return e.expanded.has(row.key) ? row.windows : [];
    case "none":
      return row.windows.length >= 2 && isExpanded(row.key, e) ? row.windows : [];
  }
}

export interface VisibleInput {
  rows: AppRow[];
  config: ListConfig;
  query: string;
  expansion: Expansion;
  windows: WindowsRead;
  badges: BadgesRead;
}

/** Ordered items: status rows first (only when a read failed and rows are visible), then apps with their children. */
export function visibleItems(input: VisibleInput): ListItem[] {
  const { rows, config, query, expansion } = input;
  const ts = tokens(query);
  const filter = config.filter;
  const matched: Array<{ row: AppRow; match: Match }> = [];
  for (const row of rows) {
    if (!rowVisibleIn(row, filter)) continue;
    const match = matchRow(row, ts);
    if (match) matched.push({ row, match });
  }
  const ordered =
    filter === "allApps"
      ? sortRows(
          matched.map((m) => ({
            ...m,
            key: m.row.key,
            name: m.row.name,
            bundleId: m.row.bundleId,
            frontZ: m.row.frontZ,
          })),
          config.sort,
          config.recent,
        )
      : matched.sort((a, b) => a.row.trackedIndex - b.row.trackedIndex);

  const items: ListItem[] = [];
  if (ordered.length > 0) {
    if (input.windows.kind === "failed") items.push({ kind: "status", id: "status:windows" });
    if (input.badges.kind === "done" && !input.badges.read.ok) items.push({ kind: "status", id: "status:badges" });
  }
  for (const { row, match } of ordered) {
    const children = childrenOf(row, match, ts, expansion);
    items.push({
      kind: "app",
      id: row.id,
      row,
      match,
      children,
      collapsed: row.windows.length >= 2 && children.length === 0,
    });
    for (const w of children) items.push({ kind: "window", id: w.key, row, window: w });
  }
  return items;
}

// ---------- Primary action (SPEC.md §4.2) ----------

export type Primary =
  | { kind: "switch"; window: WindowView; label: string }
  | { kind: "show-windows"; label: "Show Windows" }
  | { kind: "open-app"; label: "Open App" }
  | { kind: "none" };

export function primaryAction(item: AppItem): Primary {
  const { row, match, children } = item;
  const open: Primary = row.path ? { kind: "open-app", label: "Open App" } : { kind: "none" };
  if (row.windowsState !== "ok" || row.windows.length === 0) return open;
  if (match.kind === "single") return { kind: "switch", window: match.window, label: "Switch to Window" };
  if (match.kind === "multi") {
    const first = match.matches[0];
    return { kind: "switch", window: first, label: `Switch to “${first.title}”` };
  }
  if (row.windows.length === 1) return { kind: "switch", window: row.windows[0], label: "Switch to Window" };
  if (children.length > 0) return { kind: "switch", window: children[0], label: `Switch to “${children[0].title}”` };
  return { kind: "show-windows", label: "Show Windows" };
}

/** `k of N match` / `1 of N matches` accessory text while searching (§4.5); undefined otherwise. */
export function matchAccessory(item: AppItem): string | undefined {
  const n = item.row.windows.length;
  if (item.match.kind === "single" && n > 1) return `1 of ${n} matches`;
  if (item.match.kind === "multi") return `${item.match.matches.length} of ${n} match`;
  return undefined;
}

// ---------- Empty views (SPEC.md §4.4 last row, §4.6) ----------

export type EmptyKind =
  | "reading"
  | "no-match"
  | "no-apps-configured"
  | "windows-failed"
  | "badges-failed"
  | "both-failed"
  | "nothing"
  | EmptyState;

export function emptyKind(input: VisibleInput, visibleCount: number): EmptyKind | undefined {
  if (visibleCount > 0) return undefined;
  const { config, windows, badges, query } = input;
  const badgeRead = badges.kind === "done" ? badges.read : undefined;
  if (windows.kind === "loading" || badges.kind === "loading") return "reading";
  if (query.trim()) return "no-match";
  if (config.filter !== "allApps") {
    const e = emptyState(config.filter, config.apps.length, visibleCount, badgeRead);
    return e === "noApps" ? "no-apps-configured" : e;
  }
  const wf = windows.kind === "failed";
  const bf = badgeRead !== undefined && !badgeRead.ok;
  if (wf && bf) return "both-failed";
  if (wf) return "windows-failed";
  if (bf) return "badges-failed";
  return "nothing";
}

/** Front app for the Recent order's `frontAt` stamp: the owner of the on-screen window with zIndex 0. */
export function frontBundleId(list: WindowList): string | undefined {
  const front = list.windows.find((w) => w.onScreen && w.zIndex === 0);
  if (!front) return undefined;
  return list.apps.find((a) => a.pid === front.pid)?.bundleId;
}

export { isBadged };
