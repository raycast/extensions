import { captureException, closeMainWindow, environment, launchCommand, LaunchType, open } from "@raycast/api";
import { isStickiesRunning, newStickiesNote } from "./utils/applescript-utils";
import { STICKIES_PATH } from "./utils/constants";
import { autoOpen } from "./types/preference";
import { showStickiesNotRunningHUD, updateStickiesWindowsCount } from "./utils/common-utils";

export default async () => {
  try {
    if (environment.launchType === LaunchType.UserInitiated) {
      await closeMainWindow();
      const stickiesRunning = isStickiesRunning();
      if (stickiesRunning) {
        await newStickiesNote();
      } else {
        if (autoOpen) {
          await open(STICKIES_PATH);
        } else {
          await showStickiesNotRunningHUD();
        }
      }

      // Update the command metadata
      await launchCommand({ name: "close-stickies-note", type: LaunchType.Background });
    }

    await updateStickiesWindowsCount();
  } catch (e) {
    captureException(e);
  }
};
