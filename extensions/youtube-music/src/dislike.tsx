import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(
      `(function() {
        const likeRenderer = document.querySelector('ytmusic-like-button-renderer#like-button-renderer');
        if (!likeRenderer) return false;

        const dislikeButton = likeRenderer.querySelector('yt-button-shape.dislike button');
        if (dislikeButton) {
          dislikeButton.click();
          return true;
        }

        return false;
      })();`
    );

    if (result) {
      await showHUD("Disliked 👎");
    } else {
      await showHUD("Couldn't find dislike button 🤔 is Youtube Music open?");
    }

    await closeMainWindow();
  } catch (error) {
    await showHUD("❌ Failed to dislike");
  }
};
