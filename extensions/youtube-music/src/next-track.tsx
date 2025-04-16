import { closeMainWindow, showHUD } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  const jsCode = `(function() {
    const nextButton = document.querySelector('yt-icon-button.next-button button');
    if (nextButton) {
      nextButton.click();
      return true;
    }
    return false;
  })();`;

  const result = await runJSInYouTubeMusicTab(jsCode);

  if (result) {
    await showHUD("⏭ Skipped to next track");
    await closeMainWindow();
  } else {
    await showHUD("⚠️ Could not find next button");
  }
};
