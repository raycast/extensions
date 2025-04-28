import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "(document.querySelector('#like-button-renderer > tp-yt-paper-icon-button.like.style-scope.ytmusic-like-button-renderer') || document.querySelector('like-button-view-model button')).click();",
    )
  ) {
    await closeMainWindow();
  }
};
