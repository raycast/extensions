import { runJSInYouTubeMusicTab } from "./utils";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  const jsCode = `(function() {
    function clickIfNotPressed(button) {
      if (!button || button.getAttribute("aria-pressed") === "true") return false;
      button.click();
      return true;
    }

    // YouTube Music
    const ytmLike = document.querySelector('ytmusic-like-button-renderer#like-button-renderer yt-button-shape.like button');
    if (ytmLike) return clickIfNotPressed(ytmLike);

    // YouTube (normal)
    const ytLike = Array.from(document.querySelectorAll('button[aria-label*="mag das Video"]')).find(btn => btn.closest("ytd-menu-renderer"));
    if (ytLike) return clickIfNotPressed(ytLike);

    return false;
  })();`;

  try {
    const result = await runJSInYouTubeMusicTab(jsCode);
    if (result) {
      await showHUD("Liked ❤️");
    } else {
      await showHUD("Already liked 👍 or not found");
    }
    await closeMainWindow();
  } catch (error) {
    await showHUD("❌ Failed to like");
  }
};
