import { Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { addFromClipboard, addFromFinder, checkYoink, confirmAlertYoinkInstall } from "./common-utils";
import { showNotification } from "./types";

export default async () => {
  try {
    // check Yoink
    if (!checkYoink()) {
      await confirmAlertYoinkInstall();
      return;
    }
    await closeMainWindow();

    // add from Finder or Clipboard
    let addedFrom = "";
    let tipIcon = "";

    if (await addFromFinder()) {
      tipIcon = "📥";
      addedFrom = "Finder";
    } else if (await addFromClipboard()) {
      tipIcon = "📋";
      addedFrom = "Clipboard";
    }

    if (showNotification) {
      const message = addedFrom ? `${tipIcon} Added from ${addedFrom}` : "📂 No files found";
      await showHUD(message);
    }
  } catch (e) {
    console.error(e);
    await showToast({ title: `Error ${e}`, style: Toast.Style.Failure });
  }
};
