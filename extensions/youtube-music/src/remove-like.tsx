import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";
export const removeLike = `(function() {
    const isYTM = location.hostname.includes("music.youtube.com");

    if (isYTM) {
      const likeButton = document.querySelector(
        "ytmusic-like-button-renderer[like-status='LIKE'] #button-shape-like[aria-pressed='true'] > button"
      );
      if (likeButton) {
        likeButton.click();
        return "ytmusic-removed";
      }
      return "ytmusic-none";
    }

    // YouTube - new UI: segmented-like-dislike-button-view-model
    const newLikeButton = document.querySelector(
      "segmented-like-dislike-button-view-model like-button-view-model button[aria-pressed='true']"
    );
    if (newLikeButton) {
      newLikeButton.click();
      return "youtube-removed";
    }

    return "youtube-none";
  })();
`;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(removeLike);

    if (result === undefined) {
      await closeMainWindow();
      return;
    }

    switch (result) {
      case "ytmusic-removed":
        await showHUD("👍🏻 Removed Like (YT Music)");
        break;
      case "ytmusic-none":
        await showHUD("⚠️ No Like set (YT Music)");
        break;
      case "youtube-removed":
        await showHUD("👍🏻 Removed Like (YouTube)");
        break;
      case "youtube-none":
        await showHUD("⚠️ No Like set (YouTube)");
        break;
      default:
        await showHUD(`❌ Unknown Error: ${result}`);
    }
    await closeMainWindow();
  } catch (error) {
    await showHUD(`❌ Command failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
