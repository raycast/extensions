import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "document.querySelector('#like-button-renderer > tp-yt-paper-icon-button.dislike.style-scope.ytmusic-like-button-renderer').click();"
    )
  ) {
    await closeMainWindow();
  }
};
