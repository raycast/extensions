// PURE: Recently Closed. Each full read of the tab list is compared with the previous one: entries that were
// open and aren't anymore are remembered as closed, and can be opened again. Only tabs whose source can reopen
// them cleanly (a URL, a file) are tracked; see TabSource.reopenTarget. Private browsing never gets here: sources
// leave it out of the list (ADR-018). Reopening, here and for Bookmarks, jumps to a tab already showing the entry.

import { linkFor, selectTab, shareable } from "./load";
import type { App, Platform, ReopenTarget, Tab, TabKind } from "./model";
import { TabGoneError } from "./model";
import { sourceById, sourceFor } from "./registry";

export interface ClosedTab {
  /** `<bundleId> <target>`: one entry per thing to reopen, whichever tab showed it. */
  id: string;
  app: App;
  kind: TabKind;
  title: string;
  detail?: string;
  url?: string;
  /** What Copy Link copies (load.ts linkFor), when it isn't `url`; absent in entries saved before it existed. */
  link?: string;
  reopen: ReopenTarget;
  closedAt: number;
}

/** What can be opened again, in the app it was open in: a Recently Closed entry or a bookmark. */
export type Reopenable = Pick<ClosedTab, "app" | "reopen">;

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
    const link = linkFor(tab);
    const { app, kind, title, detail, url } = tab;
    return [{ id, app, kind, title, detail, url, ...(link && link !== url ? { link } : {}), reopen }];
  });
}

/** What Copy Link copies for a Recently Closed entry or bookmark: its tab's link, if shareable. */
export function entryLink(entry: Pick<ClosedTab, "link" | "url">): string | undefined {
  return shareable(entry.link ?? entry.url);
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
  // Compared by what they open, not id: a page reopened as `/x/` is `/x` open again.
  const openKeys = new Set(open.map(sameAs));
  const newlyClosed = state.open
    .filter((o) => covered(o.app.bundleId) && !openKeys.has(sameAs(o)))
    .map((o) => ({ ...o, closedAt: now }));
  const closedKeys = new Set(newlyClosed.map(sameAs));
  const closed = [...newlyClosed, ...state.closed.filter((c) => !closedKeys.has(sameAs(c)) && !openKeys.has(sameAs(c)))]
    .filter((c) => now - c.closedAt < MAX_AGE_MS)
    .slice(0, MAX_CLOSED);
  // Apps not covered by this read keep their last known open entries.
  const stillOpen = state.open.filter((o) => !covered(o.app.bundleId) && !openKeys.has(sameAs(o)));
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

/** Opens a closed entry again (jumpOrOpen) and takes it off the list. */
export async function reopenClosed(
  entry: ClosedTab,
  listed: Tab[],
  platform: Platform,
  activate: (app: App) => Promise<void>,
): Promise<void> {
  await jumpOrOpen(entry, listed, platform, activate);
  await forgetClosed(platform, entry.id);
}

/**
 * The tab among `tabs` showing `entry`: one in the app it was open in first, then the active tab of any other app
 * (a page closed in Chrome and open in Safari), then any. Pages match ignoring a trailing slash.
 */
export function openTabFor(entry: Reopenable, tabs: Tab[]): Tab | undefined {
  const target = comparable(entry.reopen);
  const showing = tabs.filter((tab) => {
    const reopen = sourceById(tab.source)?.reopenTarget?.(tab);
    return reopen?.kind === entry.reopen.kind && comparable(reopen) === target;
  });
  return showing.find((t) => t.app.bundleId === entry.app.bundleId) ?? showing.find((t) => t.active) ?? showing[0];
}

/**
 * Jumps to the tab showing `entry` and brings its app forward with `activate`; opens it in the app it was open in
 * (a URL in that app, a file with it) if no tab shows it, or the tab closed meanwhile. `listed` can be older than
 * what's open (Search shows its last list while it reads again, and the entry may have been opened since), so the
 * entry's own app is read again first.
 */
export async function jumpOrOpen(
  entry: Reopenable,
  listed: Tab[],
  platform: Platform,
  activate: (app: App) => Promise<void>,
): Promise<void> {
  const tab = openTabFor(entry, await withFreshTabs(entry.app, listed, platform));
  if (tab) {
    try {
      await selectTab(tab, platform);
      await activate(tab.app);
      return;
    } catch (error) {
      if (!(error instanceof TabGoneError)) throw error;
    }
  }
  await platform.openUrl(entry.reopen.target, entry.app.path);
}

/** `listed` with `app`'s tabs read again; as listed if that read fails. Sources never launch an app to list it. */
async function withFreshTabs(app: App, listed: Tab[], platform: Platform): Promise<Tab[]> {
  const source = sourceFor(app);
  try {
    const fresh = await source.list(app, platform);
    return [...fresh, ...listed.filter((t) => t.app.bundleId !== app.bundleId)];
  } catch (error) {
    platform.reportError(error, `tabs: ${source.id} reopen`);
    return listed;
  }
}

/** Entries that open the same thing in the same app have the same key. */
function sameAs(entry: Reopenable): string {
  return `${entry.app.bundleId} ${comparable(entry.reopen)}`;
}

function comparable(reopen: ReopenTarget): string {
  return reopen.kind === "url" ? reopen.target.replace(/\/$/, "") : reopen.target;
}
