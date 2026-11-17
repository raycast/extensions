import type { BrowserWindow } from "./types";
import { sameBrowserProcess } from "./browser-process";

function matchesTabUrl(companionUrl: string, axUrl: string): boolean {
  try {
    const full = new URL(companionUrl);
    // Firefox's unfocused address bar can omit the HTTP(S) scheme. Keep path,
    // query, fragment and any explicitly supplied scheme in the comparison.
    const omittedHttpScheme = /^https?:$/.test(full.protocol) && !/^[a-z][a-z\d+.-]*:\/\//i.test(axUrl);
    const displayed = new URL(omittedHttpScheme ? `${full.protocol}//${axUrl}` : axUrl);
    if (omittedHttpScheme && full.hostname === `www.${displayed.hostname}`) displayed.hostname = full.hostname;
    return full.href === displayed.href;
  } catch {
    return companionUrl === axUrl;
  }
}

function matchesKnownTabUrls(companion: BrowserWindow, native: BrowserWindow): boolean {
  const remaining = [...companion.tabs];
  for (const tab of native.tabs.filter((tab) => tab.url)) {
    const index = remaining.findIndex(
      (candidate) => candidate.title === tab.title && matchesTabUrl(candidate.url, tab.url),
    );
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function tabTitleSignature(window: BrowserWindow): string {
  return JSON.stringify(window.tabs.map((tab) => tab.title).sort());
}

function companionActiveTabUrl(window: BrowserWindow): string | undefined {
  if (window.activeTabUrl) return window.activeTabUrl;
  // Older companions identify the active title, but duplicate titles do not identify its URL.
  const tabs = window.tabs.filter((tab) => tab.title === window.title);
  return tabs.length === 1 ? tabs[0].url || undefined : undefined;
}

function isCandidate(companion: BrowserWindow, native: BrowserWindow, singleWindow: boolean): boolean {
  if (
    companion.browserProcess &&
    native.browserProcess &&
    !sameBrowserProcess(companion.browserProcess, native.browserProcess)
  )
    return false;
  if (native.tabListUnavailable) {
    const activeUrl = companionActiveTabUrl(companion);
    if (native.activeTabUrl && activeUrl) return matchesTabUrl(activeUrl, native.activeTabUrl);
    return singleWindow || (native.title === companion.title && companion.title !== "");
  }
  return tabTitleSignature(native) === tabTitleSignature(companion) && matchesKnownTabUrls(companion, native);
}

function uniqueMatch(matches: BrowserWindow[], candidates: BrowserWindow[][]): BrowserWindow | undefined {
  if (matches.length !== 1) return undefined;
  const native = matches[0];
  const claimants = candidates.filter((list) => list.includes(native));
  return claimants.length === 1 ? native : undefined;
}

/** Companion IDs identify profiles/tabs; native Space metadata requires a unique match on both sides. */
export function reconcileFirefoxWindows(
  companion: BrowserWindow[],
  native: BrowserWindow[],
  nativeWindowCount: number,
): BrowserWindow[] {
  const singleWindow = nativeWindowCount === 1 && native.length === 1 && companion.length === 1;
  const candidates = companion.map((window) => {
    if (!window.tabs.length || window.tabs.some((tab) => !tab.title)) return [];
    return native.filter((candidate) => isCandidate(window, candidate, singleWindow));
  });
  const covered = new Set<string>();
  const matches = new Map<number, BrowserWindow>();
  function matchUniqueWindows(lists: BrowserWindow[][]) {
    const available = lists.map((list, index) =>
      matches.has(index) ? [] : list.filter((window) => !covered.has(window.id)),
    );
    available.forEach((list, index) => {
      const match = uniqueMatch(list, available);
      if (!match) return;
      matches.set(index, match);
      covered.add(match.id);
    });
  }
  // The adapter verifies focus across the native scan before it can outrank content evidence.
  matchUniqueWindows(
    companion.map((window) =>
      window.focusVerified && window.isLastFocused
        ? native.filter(
            (candidate) =>
              candidate.isLastFocused && sameBrowserProcess(window.browserProcess, candidate.browserProcess),
          )
        : [],
    ),
  );
  // Positive tab/URL evidence takes precedence over an unreadable window's title-only possibility.
  matchUniqueWindows(
    candidates.map((list, index) =>
      list.filter(
        (window) => !window.tabListUnavailable || (window.activeTabUrl && companionActiveTabUrl(companion[index])),
      ),
    ),
  );
  // Strong matches claim their native windows first, narrowing the remaining title-only possibilities.
  matchUniqueWindows(
    candidates.map((list, index) => (matches.has(index) ? [] : list.filter((window) => !covered.has(window.id)))),
  );
  const reconciled = companion.map((window, index) => {
    const match = matches.get(index);
    if (!match) return window;
    return { ...match, ...window, nativeWindowId: match.id, space: match.space, tabListUnavailable: false };
  });
  const unmatched = native
    .filter((window) => !covered.has(window.id))
    .map((window) => {
      const possibleDuplicateOf = companion.flatMap((candidate, index) =>
        !matches.has(index) && candidates[index].includes(window) ? [candidate.id] : [],
      );
      return possibleDuplicateOf.length ? { ...window, possibleDuplicateOf } : window;
    });
  return [...reconciled, ...unmatched];
}
