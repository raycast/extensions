import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export const nextTrack = `(function() {
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
  `;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(nextTrack);

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
    // do nothing if error is thrown because it will be handled by the toast
  }
};
