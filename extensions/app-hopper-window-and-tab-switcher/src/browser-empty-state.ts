import type { BrowserConfig, BrowserWindow } from "./browsers/types";

function unavailableTabsState(browser: BrowserConfig) {
  const description =
    browser.id === "zen"
      ? "Set up Zen Integration to read tabs with the sidebar hidden, or show the sidebar in Zen and refresh."
      : "Show the browser's tab bar, then refresh this list.";
  return { title: "Tab List Unavailable", description };
}

export function tabsEmptyState(browser: BrowserConfig, window: BrowserWindow | null, error: string) {
  if (error) return { title: "Failed to Load Tabs", description: error };
  if (window?.tabListUnavailable) return unavailableTabsState(browser);
  if (window === null) return { title: "Window Closed", description: "This browser window is no longer open." };
  return { title: "No Tabs", description: "No tabs match your search in this window." };
}

export function browserEmptyState(
  browser: BrowserConfig,
  singleWindow: BrowserWindow | undefined,
  hasQuery: boolean,
  error: string,
) {
  if (error) return { title: "Failed to Load Browser Windows", description: error };
  if (singleWindow?.tabListUnavailable) return unavailableTabsState(browser);
  if (hasQuery) return { title: "No Results", description: "No windows or tabs match your search." };
  if (singleWindow) return { title: "No Tabs", description: "No tabs found in this window." };
  return { title: "No Browser Windows", description: "No open browser windows found." };
}
