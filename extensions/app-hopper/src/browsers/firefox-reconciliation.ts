import type { BrowserWindow } from "./types";

function matchesTabUrl(companionUrl: string, axUrl: string): boolean {
  try {
    const full = new URL(companionUrl);
    // Firefox's unfocused address bar can omit the HTTP(S) scheme. Keep path,
    // query, fragment and any explicitly supplied scheme in the comparison.
    const omittedHttpScheme = /^https?:$/.test(full.protocol) && !/^[a-z][a-z\d+.-]*:\/\//i.test(axUrl);
    const displayed = new URL(omittedHttpScheme ? `${full.protocol}//${axUrl}` : axUrl);
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

function isCandidate(companion: BrowserWindow, native: BrowserWindow, singleWindow: boolean): boolean {
  if (native.tabListUnavailable) {
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
  const reconciled = companion.map((window, index) => {
    const match = uniqueMatch(candidates[index], candidates);
    if (!match) return window;
    covered.add(match.id);
    return { ...match, ...window, nativeWindowId: match.id, space: match.space, tabListUnavailable: false };
  });
  return [...reconciled, ...native.filter((window) => !covered.has(window.id))];
}
