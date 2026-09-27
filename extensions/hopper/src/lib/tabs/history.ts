// PURE: Recently Closed. Each full read of the tab list is compared with the previous one: entries that were
// open and aren't anymore are remembered as closed, and can be opened again. Only tabs whose source can reopen
// them cleanly (a URL, a file) are tracked; see TabSource.reopenTarget. Private browsing never gets here: sources
// leave it out of the list (ADR-018).

import type { App, Platform, ReopenTarget, Tab, TabKind } from "./model";
import { sourceById } from "./registry";

export interface ClosedTab {
  /** `<bundleId> <target>`: one entry per thing to reopen, whichever tab showed it. */
  id: string;
  app: App;
  kind: TabKind;
  title: string;
  detail?: string;
  url?: string;
  reopen: ReopenTarget;
  closedAt: number;
}

/** Stored between reads: what was open last time, and what closed since. */
export interface HistoryState {
  open: Omit<ClosedTab, "closedAt">[];
  closed: ClosedTab[];
}

const KEY = "tabs:recently-closed";
export const MAX_CLOSED = 100;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The tabs that can be reopened once closed, one per target. */
export function reopenable(tabs: Tab[]): Omit<ClosedTab, "closedAt">[] {
  const seen = new Set<string>();
  return tabs.flatMap((tab) => {
    const reopen = sourceById(tab.source)?.reopenTarget?.(tab);
    const id = reopen && `${tab.app.bundleId} ${reopen.target}`;
    if (!reopen || !id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, app: tab.app, kind: tab.kind, title: tab.title, detail: tab.detail, url: tab.url, reopen }];
  });
}

/**
 * Next state after a read that saw `open`. `covered`: the apps this read speaks for (every app for a full read,
 * the current app for Tabs in Current App), minus apps that failed to read. What was open in a covered app and
 * isn't now is closed; what's open again leaves Recently Closed. Old and excess entries are dropped.
 */
export function nextHistory(
  state: HistoryState,
  open: Omit<ClosedTab, "closedAt">[],
  covered: (bundleId: string) => boolean,
  now: number,
): HistoryState {
  const openIds = new Set(open.map((o) => o.id));
  const newlyClosed = state.open
    .filter((o) => covered(o.app.bundleId) && !openIds.has(o.id))
    .map((o) => ({ ...o, closedAt: now }));
  const closedIds = new Set(newlyClosed.map((c) => c.id));
  const closed = [...newlyClosed, ...state.closed.filter((c) => !closedIds.has(c.id) && !openIds.has(c.id))]
    .filter((c) => now - c.closedAt < MAX_AGE_MS)
    .slice(0, MAX_CLOSED);
  // Apps not covered by this read keep their last known open entries.
  const stillOpen = state.open.filter((o) => !covered(o.app.bundleId) && !openIds.has(o.id));
  return { open: [...stillOpen, ...open], closed };
}

/** Records a read and returns what's recently closed, newest first. */
export async function recordHistory(
  platform: Platform,
  tabs: Tab[],
  covered: (bundleId: string) => boolean,
  now: number,
): Promise<ClosedTab[]> {
  const state = await platform.loadJson<HistoryState>(KEY, { open: [], closed: [] });
  const next = nextHistory(state, reopenable(tabs), covered, now);
  await platform.saveJson(KEY, next);
  return next.closed;
}

/** Recently Closed without `id`, or empty if `id` is undefined. */
export async function forgetClosed(platform: Platform, id?: string): Promise<void> {
  const state = await platform.loadJson<HistoryState>(KEY, { open: [], closed: [] });
  await platform.saveJson(KEY, { ...state, closed: id === undefined ? [] : state.closed.filter((c) => c.id !== id) });
}

/** Opens a closed entry again: a URL in its app, or a file with its app. */
export async function reopenClosed(entry: ClosedTab, platform: Platform): Promise<void> {
  await platform.openUrl(entry.reopen.target, entry.app.path);
  await forgetClosed(platform, entry.id);
}
