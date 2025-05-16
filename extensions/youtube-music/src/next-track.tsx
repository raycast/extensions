import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "(document.querySelector('#left-controls > div > yt-icon-button.next-button.style-scope.ytmusic-player-bar') || document.querySelector('.ytp-next-button')).click();",
    )
  ) {
    await closeMainWindow();
  }
};
