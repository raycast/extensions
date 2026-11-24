import { open, showHUD, showToast, Toast } from "@raycast/api";
import { isWatchedFoldersUnsupported, listWatchedFolders, pauseWatching, resumeWatching } from "./api/client";
import { AKTAR_DOWNLOAD_URL, showAktarFailure } from "./lib/errors";
import { UPDATE_FOR_WATCHED_FOLDERS, WATCHED_FOLDERS_SETTINGS_URL } from "./lib/watching";

/** Resumes watching when it's paused, otherwise pauses it until resumed. */
export default async function Command() {
  try {
    const current = await listWatchedFolders();
    if (current.folders.length === 0 && !current.paused) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No watched folders",
        message: "Add a folder in Aktar's Watched Folders settings.",
        primaryAction: { title: "Open Watched Folders Settings", onAction: () => open(WATCHED_FOLDERS_SETTINGS_URL) },
      });
      return;
    }
    if (current.paused) {
      await resumeWatching();
      await showHUD("Watching resumed");
    } else {
      await pauseWatching();
      await showHUD("Watching paused until you resume it");
    }
  } catch (error) {
    if (isWatchedFoldersUnsupported(error)) {
      await showToast({
        style: Toast.Style.Failure,
        title: UPDATE_FOR_WATCHED_FOLDERS,
        primaryAction: { title: "Download Aktar", onAction: () => open(AKTAR_DOWNLOAD_URL) },
      });
      return;
    }
    await showAktarFailure(error, "Couldn't change watching");
  }
}
