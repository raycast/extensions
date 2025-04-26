import React from "react";
import { runAppleScript } from "@raycast/utils";
import { BrowserExtension, Toast, showToast } from "@raycast/api";
import { SUPPORTED_BROWSERS } from "../src/constants";

type ActiveTab = {
  url: string;
  title: string;
};

/**
 * Hook to get the active browser tab using Raycast's Browser Extension API
 * @returns The active tab's URL and title, or null if not available
 */
export function useActiveTab() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab | null>(null);

  React.useEffect(() => {
    (async () => {
      // Try Raycast Browser Extension first
      try {
        const tabs = await BrowserExtension.getTabs();
        const extTab = tabs.find(tab => tab.active);
        if (extTab && extTab.url) {
          setActiveTab({ url: extTab.url, title: extTab.title || "" });
          return;
        }
      } catch {}

      // Fallback: AppleScript for browsers
      try {
        const activeWindow = await getActiveWindow();
        if (!SUPPORTED_BROWSERS.some((browser) => browser === activeWindow)) {
          return;
        }
        const tab = await getActiveTabFromBrowser(activeWindow);
        if (!tab) return;
        setActiveTab({ url: tab.url, title: tab.title });
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Error retrieving active tab" });
      }
    })();
  }, []);

  return activeTab;
}

// --- AppleScript helpers ---

function getActiveWindow() {
  return runAppleScript(`tell application "System Events" to get name of (processes whose frontmost is true) as text`);
}

const getActiveTabByBrowserAppleScript = {
  "Google Chrome": () => runAppleScript(`tell application "Google Chrome" to return {URL, title} of active tab of front window`),
  Arc: () => runAppleScript(`tell application "Arc" to return {URL, title} of active tab of front window`),
  Safari: () => runAppleScript(`tell application "Safari" to return {URL of front document, name of front document}`),
  "Brave Browser": () => runAppleScript(`tell application "Brave Browser" to return {URL, title} of active tab of front window`),
} as const;

export async function getActiveTabFromBrowser(browser: string): Promise<{ url: string; title: string } | null> {
  if (!SUPPORTED_BROWSERS.includes(browser)) return null;
  const scriptFn = getActiveTabByBrowserAppleScript[browser as keyof typeof getActiveTabByBrowserAppleScript];
  if (!scriptFn) return null;
  try {
    const tabString = await scriptFn();
    if (!tabString) return null;
    const commaIndex = tabString.indexOf(",");
    if (commaIndex === -1) return null;
    const url = tabString.slice(0, commaIndex).trim();
    const title = tabString.slice(commaIndex + 1).trim();
    return { url, title };
  } catch {
    return null;
  }
}