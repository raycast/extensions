import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async (closeWindow = true, volumeStep = 10) => {
  if (
    await runJSInYouTubeMusicTab(`
      (function() {
        const video = document.querySelector('video');
        if (video) {
          let volume = video.volume;
          volume = Math.min(1, volume + (${volumeStep} / 100));
          video.volume = volume;
        }
      })();
    `)
  ) {
    if (closeWindow) {
      return await closeMainWindow();
    }
  }
};
