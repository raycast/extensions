import { captureException, closeMainWindow, updateCommandMetadata } from "@raycast/api";
import { closeStickiesNote, isStickiesRunning, quitStickies } from "./utils/applescript-utils";
import { showStickiesNotRunningHUD } from "./utils/common-utils";
import { quitWhenNoWindows } from "./types/preference";
import { getStickiesNotesCount } from "./utils/stickies-utils";

export default async () => {
  try {
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
    await updateCommandMetadata({ subtitle: "Stickies" });
  } catch (e) {
    captureException(e);
  }
};
