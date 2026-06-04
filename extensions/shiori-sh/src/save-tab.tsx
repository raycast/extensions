import { BrowserExtension, environment, showToast, Toast } from "@raycast/api";
import { createLink } from "./api";

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

    const result = await createLink(activeTab.url, activeTab.title);

    if (result.duplicate) {
      toast.style = Toast.Style.Success;
      toast.title = "Already saved";
      toast.message = "Bumped to top of inbox";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Link saved";
      toast.message = activeTab.title || activeTab.url;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save";
    toast.message = String((error as Error).message || error);
  }
}
