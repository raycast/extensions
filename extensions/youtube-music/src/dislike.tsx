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
    const ytmDislike = document.querySelector('ytmusic-like-button-renderer#like-button-renderer yt-button-shape.dislike button');
    if (ytmDislike) return clickIfNotPressed(ytmDislike);

    // YouTube (normal)
    const ytDislike = Array.from(document.querySelectorAll('button[aria-label*="Mag ich nicht"]')).find(btn => btn.closest("ytd-menu-renderer"));
    if (ytDislike) return clickIfNotPressed(ytDislike);

    return false;
  })();`;

  try {
    const result = await runJSInYouTubeMusicTab(jsCode);
    if (result) {
      await showHUD("Disliked 👎");
    } else {
      await showHUD("Already disliked 👀 or not found");
    }
    await closeMainWindow();
  } catch (error) {
    await showHUD("❌ Failed to dislike");
  }
};
