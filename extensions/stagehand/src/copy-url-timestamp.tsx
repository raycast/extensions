import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { findYouTubeTabs, executeInYouTubeTab } from "./utils/browser-control";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting timestamp...",
    });

    const tabs = await findYouTubeTabs();

    if (tabs.length === 0) {
      await toast.hide();
      await showHUD("✗  No YouTube videos found");
      return;
    }

    const tab = tabs[0];

    // Get current time from the video
    const jsCode = `
      (function() {
        const video = document.querySelector('video');
        if (!video) return '0';
        return Math.floor(video.currentTime).toString();
      })();
    `;

    const currentTimeStr = await executeInYouTubeTab(tab.browser, jsCode, tab.url);
    const currentTime = parseInt(currentTimeStr) || 0;

    // Build URL with timestamp
    const baseUrl = tab.url.split("&t=")[0].split("?t=")[0];
    const urlWithTimestamp = `${baseUrl}&t=${currentTime}s`;

    await Clipboard.copy(urlWithTimestamp);

    // Format time for display
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    await toast.hide();
    await showHUD(`⧉  URL copied at ${timeDisplay}`);
  } catch (error) {
    console.error("Error copying URL with timestamp:", error);
    await showHUD("✗  Failed to copy URL");
  }
}
