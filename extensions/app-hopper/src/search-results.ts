import { getAppBrowser, getAppWindowEvidence } from "./app-window-evidence";
import type { BrowserConfig, BrowserWindow, BrowserTab } from "./browsers/types";
import type { AppGroup, Window, AXWindow } from "./windows";
import { matchesAnySearchTerm, remainingSearch, searchScore, SEARCH_WEIGHT as W } from "./helpers/search";

type ResultContext = { id: string; app: AppGroup; score: number };
export type SearchResult = ResultContext &
  (
    | { kind: "app" }
    | { kind: "window"; window: Window; browser?: BrowserConfig; browserWindow?: BrowserWindow }
    | { kind: "ax-window"; window: AXWindow }
    | { kind: "tab"; browser: BrowserConfig; window: BrowserWindow; tab: BrowserTab }
  );
export type BrowserSearchResult = { score: number; window: BrowserWindow } & (
  { kind: "window" } | { kind: "tab"; tab: BrowserTab }
);

/** Resolve held rows from live identities, even when search filtering hides them. */
export function resolveSearchResult(
  result: SearchResult,
  apps: AppGroup[],
  browserTabs: Record<string, BrowserWindow[]>,
  axWindowsByPid: Record<number, AXWindow[] | null>,
): SearchResult | undefined {
  const app = apps.find((candidate) => candidate.id === result.app.id);
  if (!app) return undefined;
  switch (result.kind) {
    case "app":
      return { ...result, app };
    case "window": {
      const window = app.windows.find(
        (candidate) => candidate.pid === result.window.pid && candidate.id === result.window.id,
      );
      if (!window) return undefined;
      const browser = getAppBrowser(app);
      const browserWindow = browserTabs[browser?.id ?? ""]?.find(
        (candidate) => (candidate.nativeWindowId ?? candidate.id) === String(window.id),
      );
      return { ...result, app, window, browser, browserWindow };
    }
    case "ax-window": {
      if (!app.pids.includes(result.window.pid)) return undefined;
      const window = axWindowsByPid[result.window.pid]?.find(
        (candidate) =>
          candidate.index === result.window.index &&
          candidate.title === result.window.title &&
          candidate.subrole === result.window.subrole,
      );
      return window ? { ...result, app, window } : undefined;
    }
    case "tab": {
      const window = browserTabs[result.browser.id]?.find((candidate) => candidate.id === result.window.id);
      const tab = window?.tabs.find((candidate) => candidate.id === result.tab.id);
      return window && tab ? { ...result, app, window, tab } : undefined;
    }
  }
}

export function tabSearchFields(tab: BrowserTab, appName: string, windowTitle: string) {
  return [
    { value: tab.title, weight: W.title },
    { value: tab.url, weight: W.url },
    { value: appName, weight: W.context },
    { value: windowTitle, weight: W.context },
  ];
}

function matchingTabs(window: BrowserWindow, appName: string, query: string) {
  const contentQuery = remainingSearch(query, [appName]) || query;
  return window.tabs.flatMap((tab) => {
    if (!matchesAnySearchTerm(contentQuery, [tab.title, tab.url])) return [];
    const score = searchScore(query, tabSearchFields(tab, appName, window.title));
    return score === null ? [] : [{ tab, score }];
  });
}

function hasSingleAppNamedWindow(app: AppGroup, evidence: ReturnType<typeof getAppWindowEvidence>): boolean {
  // Count source windows before title-based target deduplication.
  if (app.windows.length > 1) return false;
  if (evidence.accessibility.windows.length > 1) return false;
  // Space evidence also accounts for browser windows and unresolved process observations.
  if (evidence.windowSpaces.length !== 1) return false;
  const windowTargets = [...evidence.directWindows, ...evidence.accessibility.searchWindows];
  if (windowTargets.length !== 1) return false;
  const normalizeName = (name: string) => name.normalize("NFKC").trim().toLowerCase();
  return normalizeName(windowTargets[0].title) === normalizeName(app.name);
}

/** Search apps and concrete content targets together; field weights determine their ranking. */
export function searchApplications(
  apps: AppGroup[],
  query: string,
  browserTabs: Record<string, BrowserWindow[]>,
  axWindowsByPid: Record<number, AXWindow[] | null>,
): SearchResult[] {
  const appResults: SearchResult[] = [];
  for (const app of apps) {
    const appScore = searchScore(query, [
      { value: app.name, weight: W.app },
      ...app.windows.map((window) => ({ value: window.app, weight: W.app })),
    ]);
    if (appScore !== null) appResults.push({ kind: "app", id: app.id, app, score: appScore });
  }

  // Content results expose concrete targets; equal scores retain the incoming MRU order.
  const results: SearchResult[] = [...appResults];
  const appResultIds = new Set(appResults.map((result) => result.app.id));
  for (const app of apps) {
    const evidence = getAppWindowEvidence(app, { browserTabs, axWindowsByPid, browserCounts: {} });
    const browser = evidence.browser?.config;
    const cachedWindows = evidence.browser?.snapshot.windows ?? [];
    const windowsWithTabMatches = new Set<string>();
    if (browser) {
      for (const window of cachedWindows) {
        for (const { tab, score } of matchingTabs(window, app.name, query)) {
          windowsWithTabMatches.add(window.nativeWindowId ?? window.id);
          results.push({
            kind: "tab",
            id: `tab:${browser.id}:${window.id}:${tab.id}`,
            app,
            browser,
            window,
            tab,
            score,
          });
        }
      }
    }

    // The app row already reaches its only same-named window; tabs remain independent targets.
    if (appResultIds.has(app.id) && hasSingleAppNamedWindow(app, evidence)) continue;

    // Only replace the same window's summary; other windows may have unavailable tabs.
    for (const window of evidence.directWindows) {
      if (windowsWithTabMatches.has(String(window.id))) continue;
      if (!matchesAnySearchTerm(query, [window.title])) continue;
      const score = searchScore(query, [
        { value: window.title, weight: W.title },
        { value: app.name, weight: W.context },
      ]);
      if (score === null) continue;
      results.push({
        kind: "window",
        id: `window:${window.pid}:${window.id}`,
        app,
        window,
        browser,
        browserWindow: cachedWindows.find(
          (candidate) => (candidate.nativeWindowId ?? candidate.id) === String(window.id),
        ),
        score,
      });
    }
    for (const window of evidence.accessibility.searchWindows) {
      if (!matchesAnySearchTerm(query, [window.title])) continue;
      const score = searchScore(query, [
        { value: window.title, weight: W.title },
        { value: app.name, weight: W.context },
      ]);
      if (score !== null)
        results.push({
          kind: "ax-window",
          // AX indices can be reused when a window closes. Keep its expected
          // title/subrole in the row identity so an update cannot retarget a selection.
          id: `ax:${window.pid}:${JSON.stringify([window.index, window.title, window.subrole])}`,
          app,
          window,
          score,
        });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Window-title matches stay navigable even when none of their tab titles match. */
export function searchBrowserWindows(windows: BrowserWindow[], appName: string, query: string): BrowserSearchResult[] {
  const results: BrowserSearchResult[] = [];
  for (const window of windows) {
    const tabs = matchingTabs(window, appName, query);
    if (tabs.length > 0) {
      results.push(...tabs.map(({ tab, score }) => ({ kind: "tab" as const, window, tab, score })));
      continue;
    }
    if (!matchesAnySearchTerm(query, [window.title])) continue;
    const score = searchScore(query, [
      { value: window.title, weight: W.title },
      { value: appName, weight: W.context },
    ]);
    if (score !== null) results.push({ kind: "window", window, score });
  }
  return results.sort((a, b) => b.score - a.score);
}
