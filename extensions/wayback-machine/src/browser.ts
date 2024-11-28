import { environment, launchCommand, BrowserExtension, showHUD, LaunchType } from "@raycast/api";

export default async function OpenGraphWithExtension() {
  if (!environment.canAccess(BrowserExtension)) {
    showHUD("This command requires the Raycast Browser Extension to be installed.");
    return;
  }
  try {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab || !activeTab.url) {
      showHUD("No active tab found in your browser.");
      return;
    }
    launchCommand({
      name: "open",
      type: LaunchType.UserInitiated,
      arguments: {
        url: activeTab.url,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Could not connect to the Browser Extension.") {
        showHUD("Could not connect to the Browser Extension. Make sure your browser is the most forefront window.");
        return;
      }
      console.log(error.message);
      showHUD("Failed to get active tab from Raycast Browser Extension.");
    }
  }
}
