import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async (closeWindow = true) => {
  try {
    const result = await runJSInYouTubeMusicTab(`
      (function () {
        const isYouTubeMusic = window.location.hostname.includes("music.youtube.com");
        const video = document.querySelector("video");

        if (!video) return "no-video";

        // ---- YouTube Music ----
        if (isYouTubeMusic) {
          const previousBtn = document.querySelector("ytmusic-player-bar .previous-button #button");
          if (previousBtn) {
            previousBtn.click();
            return "ytmusic-prev";
          }
          return "ytmusic-fail";
        }

        // ---- YouTube (normal) ----
        if (video.currentTime > 2) {
          video.currentTime = 0;
          return "youtube-restart";
        } else {
          history.back();
          return "youtube-back";
        }
      })();
    `);

    if (closeWindow) {
      switch (result) {
        case "ytmusic-prev":
          await showHUD("⏮️ Previous Song (YT Music)");
          break;
        case "youtube-restart":
          await showHUD("🔁 Restarted Video");
          break;
        case "youtube-back":
          await showHUD("⬅️ Back to Previous Video");
          break;
        case "ytmusic-fail":
          await showHUD("❌ No previous button found (YT Music)");
          break;
        case "no-video":
          await showHUD("❌ No video element found");
          break;
        default:
          await showHUD("❌ Unknown state");
      }
      await closeMainWindow();
    }
  } catch (error) {
    if (closeWindow) {
      await showHUD("❌ Failed to run previous command");
    }
  }
};
