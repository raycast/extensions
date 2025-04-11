import { captureException, closeMainWindow, open } from "@raycast/api";
import { floatOnTopStickies, isStickiesRunning } from "./utils/applescript-utils";
import { STICKIES_PATH } from "./utils/constants";
import { autoOpen } from "./types/preference";
import { showStickiesNotRunningHUD } from "./utils/common-utils";

export default async () => {
  try {
    await closeMainWindow();
    const stickiesRunning = isStickiesRunning();
    if (stickiesRunning) {
      await floatOnTopStickies();
    } else {
      if (autoOpen) {
        await open(STICKIES_PATH);
        await floatOnTopStickies();
      } else {
        await showStickiesNotRunningHUD();
      }
    }
  } catch (e) {
    captureException(e);
  }
};
