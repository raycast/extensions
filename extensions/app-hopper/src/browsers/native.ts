import type { BrowserConfig, BrowserWindow, BrowserSummary } from "./types";
import { runBrowserHelper } from "../helpers/browser-helper";
import { assertNativeTabTarget } from "../helpers/browser-tab-id";
import { sortWindows } from "../helpers/window-utils";
import { queryWindows, Window } from "../windows";

const engines = {
  chromium: { helper: "chromium-ax", label: "Chromium", subroles: ["AXStandardWindow"] },
  webkit: { helper: "webkit-ax", label: "WebKit", subroles: ["AXStandardWindow", "AXDialog", "AXSystemDialog"] },
};

function nativeEngine(browser: BrowserConfig) {
  if (browser.engine === "firefox") throw new Error("Firefox uses its own bridge and AX fallback");
  return engines[browser.engine];
}

function parseAXWindows(raw: string, label: string): BrowserWindow[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error(`Invalid ${label} window list`);
  return value.map((window) => {
    if (!window || typeof window !== "object" || typeof window.id !== "string" || !Array.isArray(window.tabs)) {
      throw new Error(`Invalid ${label} window`);
    }
    const space =
      typeof window.space === "number" && Number.isSafeInteger(window.space) && window.space > 0
        ? window.space
        : undefined;
    return {
      id: window.id,
      title: typeof window.title === "string" ? window.title : "",
      space,
      tabs: window.tabs.map((tab: { id: string; title: string; url: string }) => {
        if (!tab || typeof tab.id !== "string" || typeof tab.title !== "string" || typeof tab.url !== "string") {
          throw new Error(`Invalid ${label} tab`);
        }
        return { id: tab.id, title: tab.title, url: tab.url };
      }),
    };
  });
}

function filterNativeWindows(windows: Window[], browser: BrowserConfig): Window[] {
  const matching = windows.filter(
    (win) =>
      win &&
      win.app === browser.appName &&
      Number.isSafeInteger(win.id) &&
      win.id > 0 &&
      (!win.subrole || nativeEngine(browser).subroles.includes(win.subrole)),
  );
  return sortWindows(matching);
}

async function queryNativeWindows(browser: BrowserConfig): Promise<Window[]> {
  try {
    const allWindows = await queryWindows();
    return filterNativeWindows(allWindows, browser);
  } catch {
    return [];
  }
}

/**
 * Retrieves native browser windows and tabs while retaining each engine's window policy.
 */
export async function getNativeBrowserWindows(
  browser: BrowserConfig,
  preloadedNativeWindows?: Window[],
): Promise<BrowserWindow[]> {
  const appName = browser.appName;
  const engine = nativeEngine(browser);
  const nativeWindows = preloadedNativeWindows
    ? filterNativeWindows(preloadedNativeWindows, browser)
    : await queryNativeWindows(browser);
  const payload = JSON.stringify(
    nativeWindows.map((win) => ({
      id: win.id,
      pid: win.pid,
      space: win.space,
      title: win.title,
      documentUrl: win.documentUrl,
    })),
  );
  const stdout = await runBrowserHelper(engine.helper, ["list", appName, payload]);
  return parseAXWindows(stdout, engine.label);
}

/**
 * Activates a specific tab through the engine's existing native helper.
 */
export async function focusNativeBrowserTab(
  browser: BrowserConfig,
  windowId: string,
  tabId: string,
  expectedTitle = "",
): Promise<void> {
  assertNativeTabTarget(windowId, tabId, nativeEngine(browser).label);

  const appName = browser.appName;
  const engine = nativeEngine(browser);
  const nativeWindows = await queryNativeWindows(browser);
  const matched = nativeWindows.find((win) => String(win.id) === windowId);
  const args = ["focus", appName, windowId, tabId, expectedTitle];
  if (matched && Number.isSafeInteger(matched.pid) && matched.pid > 0) {
    args.push(String(matched.pid));
  }

  await runBrowserHelper(engine.helper, args);
}

/** Count windows and (for a single window) tabs via the native Swift helper. */
export async function getNativeBrowserSummary(
  browser: BrowserConfig,
  preloadedNativeWindows?: Window[],
): Promise<BrowserSummary> {
  // When multiple accessible windows are already known from the native snapshot,
  // the root view only displays the window count and does not need an extra helper call.
  if (
    preloadedNativeWindows &&
    preloadedNativeWindows.length > 1 &&
    preloadedNativeWindows.every((win) => win["has-ax-reference"] !== false)
  ) {
    return { windows: preloadedNativeWindows.length };
  }

  const windows = await getNativeBrowserWindows(browser, preloadedNativeWindows);
  return {
    windows: windows.length,
    tabs: windows.length === 1 ? windows[0].tabs.length : undefined,
  };
}
