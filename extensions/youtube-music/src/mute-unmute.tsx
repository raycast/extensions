import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async (closeWindow = true) => {
  const script = `
    (function() {
      const video = document.querySelector('video');
        if (video) {
          video.muted = !video.muted;
        }
    })()
  `;
  if (await runJSInYouTubeMusicTab(script)) {
    if (closeWindow) {
      return await closeMainWindow();
    }
  }
};
