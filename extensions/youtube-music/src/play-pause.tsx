import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export const playPause = `(function() {
  const button =
    document.querySelector('#play-pause-button') ||
    document.querySelector('.ytp-play-button');

  if (!button) {
    return "no-button-found";
  }

  // Click the button and report success
  button.click();
  return "play-pause-toggled";
})();`;

export default async () => {
  try {
    const result = await runJSInYouTubeMusicTab(playPause);

    switch (result) {
      case "no-button-found":
        await showHUD("❌ No play/pause button found");
        break;
      case "play-pause-toggled":
        await showHUD("⏯️ Play/Pause toggled");
        break;
      default:
        await showHUD(`❌ Unknown Error: ${result}`);
    }
    await closeMainWindow();
  } catch (error) {
    // do nothing if error is thrown because it will be handled by the toast
  }
};
