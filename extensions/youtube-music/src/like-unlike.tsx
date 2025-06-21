import { runJSInYouTubeMusicTab } from "./utils";

/**
 * Clicks the like button in the YouTube Music player DOM if it exists.
 */
export default async function likeButton() {
  const script = `
    (function() {
        const likeButton = document.querySelector("ytmusic-like-button-renderer#like-button-renderer yt-button-shape.like button");
        if (likeButton) {
            likeButton.click();
        }
    })()
  `;

  await runJSInYouTubeMusicTab(script);
}
