import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { fetchMostRecentPhotoId, getOrExportOriginal } from "./api/photos";

export default async function Command() {
  try {
    const photoId = await fetchMostRecentPhotoId();
    const origPath = await getOrExportOriginal(photoId);

    await Clipboard.copy({ file: origPath });
    await closeMainWindow();

    await runAppleScript(`
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `);
  } catch (error) {
    await showHUD(`Failed to paste photo: ${error instanceof Error ? error.message : String(error)}`);
  }
}
