import { showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs, skipForward } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Skipping forward...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    const tab = tabs[0];
    await skipForward(tab.browser, 10);

    await toast.hide();
    await showHUD("→  +10s");
  } catch (error) {
    console.error("Error skipping forward:", error);
    await showHUD("✗  Failed to skip");
  }
}
