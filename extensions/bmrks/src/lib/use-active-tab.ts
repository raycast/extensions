import React from "react";
import { runAppleScript } from "@raycast/utils";

type ActiveTab = {
  url: string;
  title: string;
};

export function useActiveTab() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab | null>(null);

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

      const { url, title } = extractUrlAndTitle(activeTab);

      setActiveTab({
        url,
        title,
      });
    })();
  }, []);

  return activeTab;
}

/////////////////////////////////////////////////////////////////////////////////////////

type Browser = "Google Chrome" | "Safari" | "firefox" | "Brave Browser" | "Arc";

function getActiveWindow() {
  return runAppleScript(`tell application "System Events" to get name of (processes whose frontmost is true) as text`);
}

const getActiveTabByBrowser = {
  "Google Chrome": () =>
    runAppleScript(`tell application "Google Chrome" to return {URL, title} of active tab of front window`),
  Arc: () => runAppleScript(`tell application "Arc" to return {URL, title} of active tab of front window`),
  Safari: () => runAppleScript(`tell application "Safari" to return {URL of front document, name of front document}`),
  firefox: () => {},
  "Brave Browser": () =>
    runAppleScript(`tell application "Brave Browser" to return {URL, title} of active tab of front window`),
} as const;

const supportedBrowsers = Object.keys(getActiveTabByBrowser);

function extractUrlAndTitle(string: string) {
  const commaIndex = string.indexOf(",");
  const url = string.slice(0, commaIndex).trim();
  const title = string.slice(commaIndex + 1).trim();

  return {
    url,
    title: title.trim(),
  };
}
