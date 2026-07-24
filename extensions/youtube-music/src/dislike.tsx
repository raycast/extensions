import { runJSInYouTubeMusicTab } from "./utils";
import { closeMainWindow, showHUD } from "@raycast/api";

const dislike = `(function() {
  function clickIfNotPressed(button) {
    if (!button || button.getAttribute("aria-pressed") === "true") return "dislike-already-clicked";
    button.click();
    return "dislike-clicked";
  }

  // YouTube Music
  const ytmDislike = document.querySelector('ytmusic-like-button-renderer#like-button-renderer yt-button-shape.dislike button');
  if (ytmDislike) return clickIfNotPressed(ytmDislike);

  // YouTube (normal)
  const ytDislike = Array.from(document.querySelectorAll('button[aria-label*="Mag ich nicht"]')).find(btn => btn.closest("ytd-menu-renderer"));
  if (ytDislike) return clickIfNotPressed(ytDislike);

  return "dislike-not-found";
})();`;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(dislike);
    switch (result) {
      case "dislike-already-clicked":
        await showHUD("👀 Already disliked");
        break;
      case "dislike-clicked":
        await showHUD("👎 Disliked");
        break;
      case "dislike-not-found":
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
