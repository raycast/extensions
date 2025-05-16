import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "(document.querySelector('#like-button-renderer > yt-button-shape.dislike.style-scope.ytmusic-like-button-renderer button') || document.querySelector('dislike-button-view-model button')).click();",
    )
  ) {
    await closeMainWindow();
  }
};
