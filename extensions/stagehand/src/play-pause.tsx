import { showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs, togglePlayPause } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Finding media...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    // Use the first tab found (most recent/active)
    const tab = tabs[0];

    const result = await togglePlayPause(tab.browser, tab.url);

    await toast.hide();

    if (result === "playing") {
      await showHUD(`▶  Playing`);
    } else if (result === "paused") {
      await showHUD(`⏸  Paused`);
    } else if (result === "failed-to-play") {
      await showHUD(`⚠  Video not ready - play video in browser first`);
    } else {
      await showHUD(`⏯  Toggled`);
    }
  } catch (error) {
    console.error("Error toggling play/pause:", error);
    await showHUD("✗  Failed to control media");
  }
}
