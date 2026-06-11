import {
  BrowserExtension,
  environment,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { saveCardWithFeedback } from "./lib/capture";
import { getPreferences } from "./lib/preferences";

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default async function SaveCurrentBrowserTabCommand() {
  const { apiKey } = getPreferences();
  if (!apiKey?.trim()) {
    await showToast({
      message: "Set your Teak API key in extension preferences to continue.",
      primaryAction: {
        onAction: () => {
          void openExtensionPreferences();
        },
        title: "Open Preferences",
      },
      style: Toast.Style.Failure,
      title: "Missing API key",
    });
    return;
  }

  if (!environment.canAccess(BrowserExtension)) {
    await showToast({
      message: "Install or enable the Raycast Browser Extension, then retry.",
      style: Toast.Style.Failure,
      title: "Browser Extension unavailable",
    });
    return;
  }

  const tabs = await BrowserExtension.getTabs();
  const activeTab = tabs.find((tab) => tab.active && isHttpUrl(tab.url));

  if (!activeTab) {
    await showToast({
      message: "Focus a browser tab with an http(s) URL, then retry.",
      style: Toast.Style.Failure,
      title: "No active browser tab found",
    });
    return;
  }

  await saveCardWithFeedback(
    {
      content: activeTab.title?.trim() || activeTab.url,
      source: "raycast_browser_tab",
      url: activeTab.url,
    },
    {
      loadingTitle: "Saving current tab...",
    },
  );
}
