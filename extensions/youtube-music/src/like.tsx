import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "(document.querySelector('#like-button-renderer > yt-button-shape.like.style-scope.ytmusic-like-button-renderer button') || document.querySelector('like-button-view-model button')).click();",
    )
  ) {
    await closeMainWindow();
  }
};
