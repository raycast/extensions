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
        }
    })()
  `;

  await runJSInYouTubeMusicTab(script);
}
