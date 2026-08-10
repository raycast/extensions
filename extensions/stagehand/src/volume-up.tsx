import { showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs, adjustVolume } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Increasing volume...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    const tab = tabs[0];
    await adjustVolume(tab.browser, 0.1, tab.url); // +10%

    await toast.hide();
    await showHUD("↑  Volume +10%");
  } catch (error) {
    console.error("Error adjusting volume:", error);
    await showHUD("✗  Failed to adjust volume");
  }
}
