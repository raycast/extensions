import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Finding YouTube video...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    const tab = tabs[0];

    // Get the clean URL (remove timestamp if present)
    const cleanUrl = tab.url.split("&t=")[0].split("?t=")[0];

    await Clipboard.copy(cleanUrl);

    await toast.hide();
    await showHUD("⧉  URL copied");
  } catch (error) {
    console.error("Error copying URL:", error);
    await showHUD("✗  Failed to copy URL");
  }
}
