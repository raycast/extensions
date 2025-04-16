import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(
      `(function() {
        const dislikeButton = document.querySelector('#like-button-renderer > tp-yt-paper-icon-button.dislike.style-scope.ytmusic-like-button-renderer') 
          || document.querySelector('dislike-button-view-model button');
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
      await showHUD("Couldn't find dislike button 🤔");
    }

    await closeMainWindow();
  } catch (error) {
    await showHUD("❌ Failed to dislike");
  }
};
