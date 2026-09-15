import { BrowserExtension, Toast, environment, showToast } from "@raycast/api";
import { getSmryPreferences } from "./preferences";
import { saveWithFeedback } from "./save-command";
import { getActiveSupportedTab, readableTabTitle } from "./tabs";

export default async function Command() {
  if (!environment.canAccess(BrowserExtension)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Browser Extension Unavailable",
      message: "Install or enable the Raycast Browser Extension, then retry.",
    });
    return;
  }

  try {
    const activeTab = getActiveSupportedTab(await BrowserExtension.getTabs());
    if (!activeTab) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Public Browser Tab Found",
        message: "Focus a public HTTP or HTTPS page, then retry.",
      });
      return;
    }
    const { defaultSaveStatus } = getSmryPreferences();
    await saveWithFeedback({
      url: activeTab.url,
      title: readableTabTitle(activeTab),
      destination: defaultSaveStatus,
      tabId: activeTab.id,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Read the Current Tab",
      message: error instanceof Error ? error.message : "Reconnect the Raycast Browser Extension and retry.",
    });
  }
}
