import { closeMainWindow } from "@raycast/api";
import { runJSInYouTubeMusicTab } from "./utils";

export default async () => {
  if (
    await runJSInYouTubeMusicTab(
      "(document.querySelector('#play-pause-button') || document.querySelector('.ytp-play-button')).click();"
    )
  ) {
    return await closeMainWindow();
  }
};
