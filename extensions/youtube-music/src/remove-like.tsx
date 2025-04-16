import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  const jsCode = `(function() {
    const likeRenderer = document.querySelector('ytmusic-like-button-renderer#like-button-renderer');
    if (!likeRenderer) return false;

    const likeStatus = likeRenderer.getAttribute('like-status');

    // Only click the like button if the song is already liked (to unlike it)
    if (likeStatus === 'LIKE') {
      const likeButton = likeRenderer.querySelector('yt-button-shape.like button');
      if (likeButton) {
        likeButton.click();
        return true;
      }
    }
    return false;
  })();`;

  try {
    const result = await runJSInYouTubeMusicTab(jsCode);

    if (result) {
      await showHUD("Removed like 💔");
    } else {
      await showHUD("Not liked yet 🤷‍♂️ try to Dislike it");
    }

    await closeMainWindow();
  } catch (error) {
    await showHUD("❌ Failed to remove like");
  }
};
