import { showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs, toggleMute } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Toggling mute...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    const tab = tabs[0];
    const result = await toggleMute(tab.browser, tab.url);

    await toast.hide();

    if (result === "muted") {
      await showHUD("⊗  Muted");
    } else if (result === "unmuted") {
      await showHUD("♪  Unmuted");
    } else {
      await showHUD("⊗  Toggled mute");
    }
  } catch (error) {
    console.error("Error toggling mute:", error);
    await showHUD("✗  Failed to toggle mute");
  }
}
