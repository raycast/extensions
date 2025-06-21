import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async (closeWindow = true, volumeStep = 10) => {
  if (
    await runJSInYouTubeMusicTab(`
      (function() {
        const volumeSlider = document.querySelector('#volume-slider');
        if (volumeSlider) {
          const currentVolume = parseInt(volumeSlider.getAttribute('value') || '0');
          const newVolume = Math.max(0, currentVolume - ${volumeStep});
          volumeSlider.setAttribute('value', newVolume.toString());
          volumeSlider.dispatchEvent(new Event('input', { bubbles: true }));
          volumeSlider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })();
    `)
  ) {
    if (closeWindow) {
      return await closeMainWindow();
    }
  }
};
