import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(`
      (function () {
        const isYouTubeMusic = window.location.hostname.includes("music.youtube.com");

        // ---- YouTube Music ----
        if (isYouTubeMusic) {
          const nextButton = document.querySelector("ytmusic-player-bar .next-button #button");
          if (nextButton) {
            nextButton.click();
            return "ytmusic-next";
          }
          return "ytmusic-fail";
        }

        // ---- YouTube (normal) ----
        const ytNextButton = document.querySelector(".ytp-next-button");
        if (ytNextButton && !ytNextButton.disabled) {
          ytNextButton.click();
          return "youtube-next";
        }

        return "youtube-fail";
      })();
    `);

    switch (result) {
      case "ytmusic-next":
        await showHUD("⏭️ Next Song (YT Music)");
        break;
      case "youtube-next":
        await showHUD("⏭️ Next Video");
        break;
      case "ytmusic-fail":
        await showHUD("❌ No Next Button (YT Music)");
        break;
      case "youtube-fail":
        await showHUD("❌ No Next Video Button");
        break;
      default:
        await showHUD("❌ Unknown Error");
    }

    await closeMainWindow();
  } catch (error) {
    await showHUD("❌ Failed to trigger next command");
  }
};
