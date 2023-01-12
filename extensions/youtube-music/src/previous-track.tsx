import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "document.querySelector('#left-controls > div > tp-yt-paper-icon-button.previous-button.style-scope.ytmusic-player-bar').click();"
    )
  ) {
    await closeMainWindow();
  }
};
