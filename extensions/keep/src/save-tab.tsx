import { BrowserExtension, environment, showToast, Toast } from "@raycast/api";
import { saveLink } from "./api";

export default async function SaveTab() {
  if (!environment.canAccess(BrowserExtension)) {
    await showToast(
      Toast.Style.Failure,
      "Browser extension required",
      "Install the Raycast Browser Extension to use this command",
    );
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Saving current tab...");

  try {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);

    if (!activeTab?.url) {
      toast.style = Toast.Style.Failure;
      toast.title = "No active tab found";
      return;
    }

    const result = await saveLink({
      url: activeTab.url,
      title: activeTab.title,
      source: "raycast:tab",
    });

    toast.style = Toast.Style.Success;
    toast.title = result.added ? "Link saved" : "Link updated";
    toast.message = activeTab.title || result.normalizedUrl;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save";
    toast.message = String((error as Error).message || error);
  }
}
