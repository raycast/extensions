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
            return;
        }
        // Try YouTube.com like button
        const ytLikeButton = document.querySelector("#top-level-buttons-computed > segmented-like-dislike-button-view-model > yt-smartimation > div > div > like-button-view-model > toggle-button-view-model > button-view-model > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill");
        if (ytLikeButton) {
            ytLikeButton.click();
        }
    })()
  `;

  await runJSInYouTubeMusicTab(script);
}
