import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  const jsCode = `(function() {
    const prevButton = document.querySelector('yt-icon-button.previous-button button');
    if (prevButton) {
      prevButton.click();
      return true;
    }
    return false;
  })();`;

  const result = await runJSInYouTubeMusicTab(jsCode);

  if (result) {
    await showHUD("⏮ Rewinded to previous track");
    await closeMainWindow();
  } else {
    await showHUD("⚠️ Could not find previous button");
  }
};
