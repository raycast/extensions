import { captureException, closeMainWindow, environment, launchCommand, LaunchType, open } from "@raycast/api";
import { floatOnTopStickies, isStickiesRunning } from "./utils/applescript-utils";
import { STICKIES_PATH } from "./utils/constants";
import { autoOpen } from "./types/preference";
import { showStickiesNotRunningHUD } from "./utils/common-utils";

export default async () => {
  try {
    if (environment.launchType === LaunchType.UserInitiated) {
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
      // Update the command metadata
      await launchCommand({ name: "new-stickies-note", type: LaunchType.Background });
      await launchCommand({ name: "close-stickies-note", type: LaunchType.Background });
    }
  } catch (e) {
    captureException(e);
  }
};
