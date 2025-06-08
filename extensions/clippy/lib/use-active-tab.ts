import React from "react";
import { runAppleScript } from "@raycast/utils";

export function useActiveTab() {
  const [activeTab, setActiveTab] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const activeWindow = await getActiveWindow();

      if (!supportedBrowsers.some((browser) => browser === activeWindow)) {
        return;
      }

      const activeTab = await getActiveTabByBrowser[activeWindow as Browser]();

      if (!activeTab) {
        return;
      }

      const url = extractUrl(activeTab);

      setActiveTab(url);
    })();
  }, [setActiveTab]);

  return activeTab;
}

/////////////////////////////////////////////////////////////////////////////////////////

type Browser = "Google Chrome" | "Safari" | "firefox" | "Brave Browser" | "Arc";

function getActiveWindow() {
  return runAppleScript(`tell application "System Events" to get name of (processes whose frontmost is true) as text`);
}

const getActiveTabByBrowser = {
  "Google Chrome": () =>
    runAppleScript(`tell application "Google Chrome" to return {URL} of active tab of front window`),
  Arc: () => runAppleScript(`tell application "Arc" to return {URL} of active tab of front window`),
  Safari: () => runAppleScript(`tell application "Safari" to return {URL of front document}`),
  firefox: () => {},
  "Brave Browser": () =>
    runAppleScript(`tell application "Brave Browser" to return {URL} of active tab of front window`),
} as const;

const supportedBrowsers = Object.keys(getActiveTabByBrowser);

function extractUrl(string: string) {
  const url = string.trim();

  return url;
}
