import { runJSInYouTubeMusicTab } from "./utils";
import { closeMainWindow, showHUD } from "@raycast/api";

export const like = `(function() {
    function clickIfNotPressed(button) {
      if (!button || button.getAttribute("aria-pressed") === "true") return "like-already-clicked";
      button.click();
      return "like-clicked";
    }

    // YouTube Music
    const ytmLike = document.querySelector('ytmusic-like-button-renderer#like-button-renderer yt-button-shape.like button');
    if (ytmLike) return clickIfNotPressed(ytmLike);

    // YouTube (normal)
    const ytLike = Array.from(document.querySelectorAll('button[aria-label*="mag das Video"]')).find(btn => btn.closest("ytd-menu-renderer"));
    if (ytLike) return clickIfNotPressed(ytLike);

    return "like-not-found";
  })();`;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(like);
    switch (result) {
      case "like-already-clicked":
        await showHUD("👍 Already liked");
        break;
      case "like-clicked":
        await showHUD("❤️ Liked");
        break;
      case "like-not-found":
        await showHUD("❌ Not found");
        break;
      default:
        await showHUD(`❌ Unknown Error: ${result}`);
    }
    await closeMainWindow();
  } catch (error) {
    // do nothing if error is thrown because it will be handled by the toast
  }
};
