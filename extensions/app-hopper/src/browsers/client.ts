import type { BrowserConfig, BrowserWindow } from "./types";
import { focusNativeBrowserTab, getNativeBrowserSummary, getNativeBrowserWindows } from "./native";
import { focusFirefoxTab, getFirefoxSummary, getFirefoxWindows } from "./firefox";
import { queryWindows, type Window } from "../windows";
import { createBrowserSnapshot } from "./snapshot";

const pendingWindows = new Map<string, Promise<BrowserWindow[]>>();

export async function getBrowserWindows(
  browser: BrowserConfig,
  preloadedNativeWindows?: Window[],
): Promise<BrowserWindow[]> {
  const snapshot = createBrowserSnapshot(browser, {
    nativeWindows: preloadedNativeWindows ?? (await queryWindows().catch(() => [])),
  });
  const { key, nativeWindows = [] } = snapshot;
  const existing = pendingWindows.get(key);
  if (existing) return existing;

  const pending = readBrowserWindows(browser, nativeWindows);
  pendingWindows.set(key, pending);
  const clear = () => pendingWindows.delete(key);
  void pending.then(clear, clear);
  return pending;
}

async function readBrowserWindows(browser: BrowserConfig, nativeWindows: Window[]): Promise<BrowserWindow[]> {
  const windows =
    browser.engine === "firefox"
      ? await getFirefoxWindows(browser, nativeWindows)
      : await getNativeBrowserWindows(browser, nativeWindows);

  // Match window state by verified native identity; unmapped bridge IDs receive only app-wide facts.
  const allHidden = nativeWindows.length > 0 && nativeWindows.every((window) => window.isHidden === true);
  const allMinimized = nativeWindows.length > 0 && nativeWindows.every((window) => window.isMinimized === true);
  return windows.map((window) => {
    const native = nativeWindows.find((candidate) => String(candidate.id) === (window.nativeWindowId ?? window.id));
    return {
      ...window,
      space: window.space ?? (native?.space && native.space > 0 ? native.space : undefined),
      isHidden: native?.isHidden ?? (allHidden ? true : undefined),
      isMinimized: native?.isMinimized ?? (allMinimized ? true : undefined),
    };
  });
}

export async function getBrowserSummary(browser: BrowserConfig, nativeWindows?: Window[]) {
  if (browser.engine === "firefox") return getFirefoxSummary(browser, nativeWindows);
  return getNativeBrowserSummary(browser, nativeWindows);
}

export async function focusBrowserTab(
  browser: BrowserConfig,
  window: BrowserWindow,
  tab: BrowserWindow["tabs"][number],
) {
  if (browser.engine === "firefox") {
    return focusFirefoxTab(window.id, tab.id, browser, tab.title, window.nativeWindowId);
  }
  return focusNativeBrowserTab(browser, window.id, tab.id, tab.title);
}
