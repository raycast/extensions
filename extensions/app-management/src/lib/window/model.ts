// Copied from raycast-window-switcher src/lib/model.ts on 2026-09-30, unchanged except this header
// Grouping, ordering, search, duplicate numbering, and Desktop labels (SPEC.md §5, §6.4, §8). Pure.
import type { HelperApp, HelperWindow, WindowList } from "./protocol.ts";

/** 0 = no Desktop labels (default). 1 = "Other Desktop" tag. Tier 2 (numbered Desktops) is not implemented. */
export type LabelTier = 0 | 1;

export type WindowGroup = 0 | 1 | 2 | 3; // on screen, off screen, minimized, unresolved

export interface WindowView {
  key: string;
  pid: number;
  wid: number;
  appName: string;
  bundleId?: string;
  rawTitle: string;
  title: string;
  isMinimized: boolean;
  isFullscreen: boolean;
  appHidden: boolean;
  resolved: boolean;
  otherDesktop: boolean;
  group: WindowGroup;
  zIndex?: number;
  duplicate?: { index: number; count: number };
}

export interface AppView {
  key: string;
  pid: number;
  name: string;
  bundleId?: string;
  bundlePath?: string;
  isHidden: boolean;
  windows: WindowView[];
  minimizedCount: number;
  otherDesktopCount: number;
  unresolvedCount: number;
  warnings: string[];
}

export const UNTITLED = "Untitled window";
export const TITLE_UNAVAILABLE = "Window (title unavailable)";

export function displayTitle(w: Pick<HelperWindow, "title" | "resolved">): string {
  const t = w.title.trim();
  if (t) return t;
  return w.resolved ? UNTITLED : TITLE_UNAVAILABLE;
}

/**
 * Tier 1 "Other Desktop": the window is on exactly one Space and that Space is not visible on any display.
 * Minimized windows are excluded because the WindowServer can report several Spaces for them.
 * Never derived from window position.
 */
export function isOtherDesktop(w: HelperWindow, list: WindowList, tier: LabelTier): boolean {
  if (tier < 1 || !list.spaces.available || w.isMinimized) return false;
  if (w.spaceIds.length !== 1) return false;
  return !list.spaces.visibleSpaceIds.includes(w.spaceIds[0]);
}

export function windowGroup(w: HelperWindow): WindowGroup {
  if (!w.resolved) return 3;
  if (w.isMinimized) return 2;
  if (w.onScreen) return 0;
  return 1;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export function compareWindows(a: WindowView, b: WindowView): number {
  if (a.group !== b.group) return a.group - b.group;
  if (a.group === 0 && a.zIndex !== undefined && b.zIndex !== undefined && a.zIndex !== b.zIndex) {
    return a.zIndex - b.zIndex;
  }
  return collator.compare(a.title, b.title) || a.wid - b.wid;
}

export function compareApps(a: AppView, b: AppView): number {
  return collator.compare(a.name, b.name) || a.pid - b.pid;
}

/** Numbers identical display titles within one app, in list order: "2 of 3". */
export function numberDuplicates(windows: WindowView[]): void {
  const totals = new Map<string, number>();
  for (const w of windows) totals.set(w.title, (totals.get(w.title) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const w of windows) {
    const count = totals.get(w.title) ?? 1;
    if (count < 2) {
      w.duplicate = undefined;
      continue;
    }
    const index = (seen.get(w.title) ?? 0) + 1;
    seen.set(w.title, index);
    w.duplicate = { index, count };
  }
}

export function buildApps(list: WindowList, tier: LabelTier): AppView[] {
  const appsByPid = new Map<number, HelperApp>(list.apps.map((a) => [a.pid, a]));
  const byPid = new Map<number, WindowView[]>();
  for (const w of list.windows) {
    const app = appsByPid.get(w.pid);
    if (!app) continue;
    const view: WindowView = {
      key: `win-${w.pid}-${w.wid}`,
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
    };
    const bucket = byPid.get(w.pid) ?? [];
    bucket.push(view);
    byPid.set(w.pid, bucket);
  }
  const apps: AppView[] = [];
  for (const [pid, windows] of byPid) {
    const app = appsByPid.get(pid)!;
    windows.sort(compareWindows);
    numberDuplicates(windows);
    apps.push({
      key: `app-${pid}`,
      pid,
      name: app.name,
      bundleId: app.bundleId,
      bundlePath: app.bundlePath,
      isHidden: app.isHidden,
      windows,
      minimizedCount: windows.filter((w) => w.isMinimized).length,
      otherDesktopCount: windows.filter((w) => w.otherDesktop).length,
      unresolvedCount: windows.filter((w) => !w.resolved).length,
      warnings: list.warnings.filter((x) => x.pid === pid).map((x) => x.message),
    });
  }
  return apps.sort(compareApps);
}

// ---------- Search (SPEC.md §5.5) ----------

export function tokens(query: string): string[] {
  return query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
}

const includesAll = (haystack: string, ts: string[]) => {
  const h = haystack.toLocaleLowerCase();
  return ts.every((t) => h.includes(t));
};

/** A window matches when every token is in its app name or its display title. */
export function windowMatches(w: WindowView, ts: string[]): boolean {
  return ts.length === 0 || includesAll(`${w.appName} ${w.title}`, ts);
}

export type RootRow =
  | { kind: "app"; app: AppView } // no query, or the query matches the app name
  | { kind: "single-match"; app: AppView; window: WindowView } // query matches exactly one window title
  | { kind: "multi-match"; app: AppView; matches: WindowView[] }; // query matches several window titles

export function rootRows(apps: AppView[], query: string): RootRow[] {
  const ts = tokens(query);
  if (ts.length === 0) return apps.map((app) => ({ kind: "app", app }));
  const rows: RootRow[] = [];
  for (const app of apps) {
    if (includesAll(app.name, ts)) {
      rows.push({ kind: "app", app });
      continue;
    }
    const matches = app.windows.filter((w) => windowMatches(w, ts));
    if (matches.length === 1) rows.push({ kind: "single-match", app, window: matches[0] });
    else if (matches.length > 1) rows.push({ kind: "multi-match", app, matches });
  }
  return rows;
}

/**
 * What Return does on a root row. A window is focused from the root only when the row shows exactly that
 * window's title; otherwise the child list opens.
 */
export type RootPrimary =
  { kind: "focus"; window: WindowView } | { kind: "open-child"; prefill: string } | { kind: "none" };

export function rootPrimary(row: RootRow, query: string): RootPrimary {
  switch (row.kind) {
    case "single-match":
      return { kind: "focus", window: row.window };
    case "multi-match":
      return { kind: "open-child", prefill: query.trim() };
    case "app":
      if (row.app.windows.length === 1) return { kind: "focus", window: row.app.windows[0] };
      if (row.app.windows.length === 0) return { kind: "none" };
      return { kind: "open-child", prefill: "" };
  }
}

export function rootSubtitle(row: RootRow): string | undefined {
  if (row.kind === "single-match") return row.window.title;
  if (row.kind === "app" && row.app.windows.length === 1) return row.app.windows[0].title;
  return undefined;
}

export function childWindows(app: AppView, query: string): WindowView[] {
  const ts = tokens(query);
  return app.windows.filter((w) => windowMatches(w, ts));
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
