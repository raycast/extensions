import { showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs, skipBackward } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Skipping backward...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    const tab = tabs[0];
    await skipBackward(tab.browser, 10);

    await toast.hide();
    await showHUD("←  -10s");
  } catch (error) {
    console.error("Error skipping backward:", error);
    await showHUD("✗  Failed to skip");
  }
}
