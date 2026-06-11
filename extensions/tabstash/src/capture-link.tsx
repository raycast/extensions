import {
  BrowserExtension,
  environment,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript, withAccessToken } from "@raycast/utils";
import { captureLink } from "./api";
import { provider } from "./provider";

interface TabInfo {
  url: string;
  title?: string;
}

async function getCurrentTab(): Promise<TabInfo | null> {
  // Primary: Raycast Browser Extension API
  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);
      if (activeTab?.url) {
        return { url: activeTab.url, title: activeTab.title };
      }
    } catch {
      // Fall through to AppleScript
    }
  }

  // Fallback: AppleScript for common browsers
  const scripts: { app: string; script: string }[] = [
    {
      app: "Google Chrome",
      script: `tell application "Google Chrome" to return {URL of active tab of first window, title of active tab of first window}`,
    },
    {
      app: "Safari",
      script: `tell application "Safari" to return {URL of current tab of first window, name of current tab of first window}`,
    },
    {
      app: "Arc",
      script: `tell application "Arc" to return {URL of active tab of first window, title of active tab of first window}`,
    },
  ];

  for (const { script } of scripts) {
    try {
      const result = await runAppleScript(script);
      if (result) {
        // AppleScript joins list items with ", " — split on first occurrence
        // only, since titles may contain commas.
        const sep = result.indexOf(", ");
        if (sep !== -1) {
          const url = result.slice(0, sep).trim();
          const title = result.slice(sep + 2).trim();
          if (url) return { url, title };
        }
      }
    } catch {
      // Browser not running, try next
    }
  }

  return null;
}

async function CaptureLink() {
  const tab = await getCurrentTab();

  if (!tab) {
    await showHUD("No browser tab found");
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Saving to TabStash...",
    });
    await captureLink(tab.url, tab.title);
    await showHUD("Saved to TabStash");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Capture failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAccessToken(provider)(CaptureLink);
