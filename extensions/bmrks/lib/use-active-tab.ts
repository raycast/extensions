import React from "react";
import { BrowserExtension, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

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
        if (!supportedBrowsers.some((browser) => browser === activeWindow)) {
          return;
        }
        const tabString = await getActiveTabByBrowser[activeWindow as Browser]();
        if (!tabString) return;
        const { url, title } = extractUrlAndTitle(tabString);
        setActiveTab({ url, title });
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Error retrieving active tab" });
      }
    })();
  }, []);

  return activeTab;
}

// --- AppleScript helpers ---
type Browser = "Google Chrome" | "Safari" | "firefox" | "Brave Browser" | "Arc";

function getActiveWindow() {
  return runAppleScript(`tell application "System Events" to get name of (processes whose frontmost is true) as text`);
}

const getActiveTabByBrowser = {
  "Google Chrome": () =>
    runAppleScript(`tell application "Google Chrome" to return {URL, title} of active tab of front window`),
  Arc: () => runAppleScript(`tell application "Arc" to return {URL, title} of active tab of front window`),
  Safari: () => runAppleScript(`tell application "Safari" to return {URL of front document, name of front document}`),
  firefox: () => Promise.resolve(""), // Not implemented
  "Brave Browser": () =>
    runAppleScript(`tell application "Brave Browser" to return {URL, title} of active tab of front window`),
} as const;

const supportedBrowsers = Object.keys(getActiveTabByBrowser);

function extractUrlAndTitle(string: string) {
  const commaIndex = string.indexOf(",");
  const url = string.slice(0, commaIndex).trim();
  const title = string.slice(commaIndex + 1).trim();
  return { url, title };
}

