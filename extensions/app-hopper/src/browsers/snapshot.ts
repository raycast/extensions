import type { Window } from "../windows";
import type { BrowserConfig, BrowserSummary, BrowserWindow } from "./types";

interface BrowserSnapshotData {
  /** Omitted data requests live discovery; [] is a known empty native observation. */
  nativeWindows?: Window[];
  windows?: BrowserWindow[];
  summary?: BrowserSummary;
}

export interface BrowserSnapshot extends BrowserSnapshotData {
  browser: BrowserConfig;
  key: string;
}

/** Keep browser data paired with the native snapshot used to discover it. */
export function createBrowserSnapshot(browser: BrowserConfig, data: BrowserSnapshotData = {}): BrowserSnapshot {
  const nativeWindows = data.nativeWindows?.filter((window) => window.app === browser.appName);
  return {
    ...data,
    browser,
    nativeWindows,
    key: JSON.stringify([browser.id, browser.appName, browser.engine, nativeWindows]),
  };
}

export function summarizeBrowserWindows(windows: BrowserWindow[]): BrowserSummary {
  const single = windows.length === 1 ? windows[0] : undefined;
  return { windows: windows.length, tabs: single && !single.tabListUnavailable ? single.tabs.length : undefined };
}

/** Retain enrichment only for the same native window/process identities. */
export function retainBrowserSnapshot(previous: BrowserSnapshot, nativeWindows: Window[]): BrowserSnapshot {
  const next = createBrowserSnapshot(previous.browser, { nativeWindows });
  const before = previous.nativeWindows ?? [];
  const after = next.nativeWindows ?? [];
  const sameWindows =
    before.length === after.length &&
    after.every((window) => before.some((candidate) => candidate.id === window.id && candidate.pid === window.pid));
  if (sameWindows) return { ...next, windows: previous.windows, summary: previous.summary };
  if (!before.length) return next;

  const retained = (previous.windows ?? []).filter((window) =>
    after.some(
      (candidate) =>
        String(candidate.id) === (window.nativeWindowId ?? window.id) &&
        before.some((old) => old.id === candidate.id && old.pid === candidate.pid),
    ),
  );
  return {
    ...next,
    windows: retained.length ? retained : undefined,
    summary: {
      windows: after.length,
      tabs: after.length === 1 && retained.length === 1 ? summarizeBrowserWindows(retained).tabs : undefined,
    },
  };
}
