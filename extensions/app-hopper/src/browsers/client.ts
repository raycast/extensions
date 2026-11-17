import type { BrowserConfig, BrowserWindow } from "./types";
import { focusNativeBrowserTab, getNativeBrowserSummary, getNativeBrowserWindows } from "./native";
import { focusFirefoxTab, getFirefoxSummary, getFirefoxWindows } from "./firefox";
import { queryWindows, type Window } from "../windows";
import { createBrowserSnapshot } from "./snapshot";

interface BrowserScan {
  controller: AbortController;
  promise: Promise<BrowserWindow[]>;
  consumers: number;
  settled: boolean;
}

const pendingWindows = new Map<string, BrowserScan>();

/** Each caller owns its wait; only the last departing caller cancels shared work. */
function joinScan(scan: BrowserScan, signal?: AbortSignal): Promise<BrowserWindow[]> {
  scan.consumers++;
  return new Promise((resolve, reject) => {
    let complete = false;
    function finish(callback: () => void) {
      if (complete) return;
      complete = true;
      signal?.removeEventListener("abort", cancel);
      scan.consumers--;
      if (!scan.consumers && !scan.settled) scan.controller.abort();
      callback();
    }
    const cancel = () => finish(() => reject(signal!.reason));
    signal?.addEventListener("abort", cancel, { once: true });
    scan.promise.then(
      (windows) => finish(() => resolve(windows)),
      (error) => finish(() => reject(error)),
    );
    if (signal?.aborted) cancel();
  });
}

export async function getBrowserWindows(
  browser: BrowserConfig,
  preloadedNativeWindows?: Window[],
  signal?: AbortSignal,
): Promise<BrowserWindow[]> {
  signal?.throwIfAborted();
  let native = preloadedNativeWindows;
  if (native === undefined) {
    try {
      native = await queryWindows(signal, browser);
    } catch {
      signal?.throwIfAborted();
      native = [];
    }
  }
  signal?.throwIfAborted();
  const snapshot = createBrowserSnapshot(browser, {
    nativeWindows: native,
  });
  const { key, nativeWindows = [] } = snapshot;
  const existing = pendingWindows.get(key);
  if (existing) return joinScan(existing, signal);

  const controller = new AbortController();
  const scan: BrowserScan = {
    controller,
    promise: readBrowserWindows(browser, nativeWindows, controller.signal),
    consumers: 0,
    settled: false,
  };
  pendingWindows.set(key, scan);
  const clear = () => {
    if (pendingWindows.get(key) === scan) pendingWindows.delete(key);
  };
  controller.signal.addEventListener("abort", clear, { once: true });
  const settled = () => {
    scan.settled = true;
    controller.signal.removeEventListener("abort", clear);
    clear();
  };
  void scan.promise.then(settled, settled);
  return joinScan(scan, signal);
}

async function readBrowserWindows(
  browser: BrowserConfig,
  nativeWindows: Window[],
  signal: AbortSignal,
): Promise<BrowserWindow[]> {
  const windows =
    browser.engine === "firefox"
      ? await getFirefoxWindows(browser, nativeWindows, signal)
      : await getNativeBrowserWindows(browser, nativeWindows, signal);
  signal.throwIfAborted();

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

export async function getBrowserSummary(browser: BrowserConfig, nativeWindows?: Window[], signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (browser.engine === "firefox") return getFirefoxSummary(browser, nativeWindows, signal);
  return getNativeBrowserSummary(browser, nativeWindows, signal);
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
