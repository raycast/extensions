import { captureException, closeMainWindow, open, updateCommandMetadata } from "@raycast/api";
import { isStickiesRunning, newStickiesNote } from "./utils/applescript-utils";
import { STICKIES_PATH } from "./utils/constants";
import { autoOpen } from "./types/preference";
import { showStickiesNotRunningHUD } from "./utils/common-utils";

export default async () => {
  try {
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
    await updateCommandMetadata({ subtitle: "Stickies" });
  } catch (e) {
    captureException(e);
  }
};
