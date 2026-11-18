import { activate_tab, close_tab, list_tabs } from "rust:../../rust";
import { Application, captureException, LocalStorage, open, showHUD } from "@raycast/api";
import { BrowserSetup, BrowserTab, Tab } from "../types/types";
import { CacheKey } from "./constants";
import { isNotEmpty } from "./common-utils";
import { recentOnTop } from "../types/preferences";

// Windows implementation.
//
// macOS reads tabs through AppleScript. Windows has no equivalent, so tabs are read from
// running browsers through UI Automation in a small native helper (see ../../rust), which
// also handles focusing and closing a tab. Windows does not expose a tab's URL, so the
// helper resolves URLs on a best effort basis: the tab being displayed reports its exact
// URL, and background tabs are matched by title against the browser's history.

type NativeTab = {
  browser: string;
  browser_path: string;
  window_handle: number;
  runtime_id: string;
  title: string;
  url: string;
  favicon: string;
  is_active: boolean;
};

// the command lists tabs twice on launch (once for the browser setup, once for the tabs),
// so concurrent scans share a single pass over the accessibility tree
let scan: Promise<BrowserTab[]> | undefined;

const scanBrowsers = (): Promise<BrowserTab[]> => {
  if (!scan) {
    scan = readBrowsers().finally(() => {
      scan = undefined;
    });
  }
  return scan;
};

const readBrowsers = async (): Promise<BrowserTab[]> => {
  try {
    const nativeTabs = (await list_tabs()) as NativeTab[];
    const browsers = new Map<string, BrowserTab>();

    for (const nativeTab of nativeTabs) {
      if (!browsers.has(nativeTab.browser_path)) {
        browsers.set(nativeTab.browser_path, {
          browser: { name: nativeTab.browser, path: nativeTab.browser_path },
          tabs: [],
        });
      }
      let domain = "";
      try {
        domain = new URL(nativeTab.url).hostname;
      } catch {
        // tabs whose URL could not be resolved have no domain
      }
      browsers.get(nativeTab.browser_path)?.tabs.push({
        browser: nativeTab.browser,
        title: nativeTab.title,
        url: nativeTab.url,
        domain,
        windowId: String(nativeTab.window_handle),
        tabId: nativeTab.runtime_id,
        favicon: nativeTab.favicon || undefined,
      });
    }

    return Array.from(browsers.values()).map((browserTab) =>
      recentOnTop ? { ...browserTab, tabs: browserTab.tabs.reverse() } : browserTab,
    );
  } catch (e) {
    captureException(e);
    console.error("Error fetching browser tabs");
    return [];
  }
};

export const getBrowsersTabs = async (): Promise<BrowserTab[]> => {
  const disabled = await readDisabledBrowsers();
  return (await scanBrowsers()).filter((browserTab) => !disabled.includes(browserTab.browser.path));
};

export const jumpToBrowserTab = async (browser: Application, tab: Tab) => {
  try {
    await activate_tab(Number(tab.windowId), tab.tabId);
    return "";
  } catch (e) {
    console.error(`Error jumpToBrowserTab for ${browser.name}`);
    // Raycast has already closed by this point, so a failure here would otherwise be
    // invisible. Opening the tab's address gets the user where they asked to go, the same
    // way macOS falls back when a tab cannot be focused.
    if (isNotEmpty(tab.url)) {
      try {
        await open(tab.url, browser);
        return "";
      } catch {
        // nothing left to try
      }
    }
    await showHUD("Could not switch to the tab");
    return String(e);
  }
};

export const closeBrowserTab = async (browser: Application, tab: Tab) => {
  try {
    await close_tab(Number(tab.windowId), tab.tabId);
    return "";
  } catch (e) {
    console.error(`Error closeBrowserTab for ${browser.name}`);
    return String(e);
  }
};

const readDisabledBrowsers = async (): Promise<string[]> => {
  const stored = await LocalStorage.getItem<string>(CacheKey.BrowserSetup);
  if (!stored) {
    return [];
  }
  const setups = JSON.parse(stored) as BrowserSetup[];
  return setups.filter((setup) => !setup.isChecked).map((setup) => setup.browser.path);
};

// browsers are discovered while scanning tabs, so the setup list is derived from that scan
export const getBrowserSetup = async (): Promise<BrowserSetup[]> => {
  try {
    const disabled = await readDisabledBrowsers();
    return (await scanBrowsers()).map((browserTab) => ({
      browser: browserTab.browser,
      isChecked: !disabled.includes(browserTab.browser.path),
    }));
  } catch (e) {
    captureException(e);
    console.error("Error fetching browsers");
    return [];
  }
};
