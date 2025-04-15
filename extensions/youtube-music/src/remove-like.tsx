import { closeMainWindow } from "@raycast/api";
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

  const result = await runJSInYouTubeMusicTab(jsCode);

  if (result) {
    await closeMainWindow();
  }
};
