import { BrowserExtension, environment, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  saveCardWithFeedback,
} from "./lib/capture";

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default async function SaveCurrentBrowserTabCommand() {
  if (!(await ensureCredentialsForNoViewCommand())) {
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
