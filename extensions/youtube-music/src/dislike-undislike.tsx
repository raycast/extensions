import { runJSInYouTubeMusicTab } from "./utils";

/**
 * Clicks the dislike button in the YouTube Music player DOM if it exists.
 */
export default async function dislikeUndislikeButton() {
  const script = `
    (function() {
        const dislikeButton = document.querySelector("#button-shape-dislike > button");
        if (dislikeButton) {
            dislikeButton.click();
            return;
        }
        // Try YouTube.com dislike button
        const ytDislikeButton = document.querySelector("#top-level-buttons-computed > segmented-like-dislike-button-view-model > yt-smartimation > div > div > dislike-button-view-model > toggle-button-view-model > button-view-model > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill");
        if (ytDislikeButton) {
            ytDislikeButton.click();
        }
    })()
  `;

  await runJSInYouTubeMusicTab(script);
}
