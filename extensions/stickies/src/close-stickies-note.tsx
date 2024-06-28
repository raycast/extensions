import { captureException, closeMainWindow, environment, launchCommand, LaunchType } from "@raycast/api";
import { closeStickiesNote, isStickiesRunning, quitStickies } from "./utils/applescript-utils";
import { showStickiesNotRunningHUD, updateStickiesWindowsCount } from "./utils/common-utils";
import { quitWhenNoWindows } from "./types/preference";
import { getStickiesNotesCount } from "./utils/stickies-utils";

export default async () => {
  try {
    if (environment.launchType === LaunchType.UserInitiated) {
      await closeMainWindow();
      const stickiesRunning = isStickiesRunning();
      if (stickiesRunning) {
        await closeStickiesNote();
        const windowCount = await getStickiesNotesCount();
        if (windowCount === 1 && quitWhenNoWindows) {
          await quitStickies();
        }
      } else {
        await showStickiesNotRunningHUD();
      }

      // Update the command metadata
      await launchCommand({ name: "new-stickies-note", type: LaunchType.Background });
    }
    await updateStickiesWindowsCount();
  } catch (e) {
    captureException(e);
  }
};
