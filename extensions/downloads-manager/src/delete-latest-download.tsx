import { getLatestDownload, hasAccessToDownloadsFolder, deleteFileOrFolder } from "./utils";
import { closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  const latestDownload = getLatestDownload();
  if (!latestDownload) {
    await showHUD("No downloads found");
    return;
  }

  try {
    await deleteFileOrFolder(latestDownload.path);
  } catch (error) {
    await showFailureToast(error, { title: "Deletion Failed" });
  }

  // Close the main window after the deletion so that when this command is
  // launched via a deeplink (e.g. `open -g raycast://...`), Raycast doesn't
  // get pulled into focus. Placed after deletion so any confirmAlert dialog
  // inside deleteFileOrFolder can still show while the window is open.
  await closeMainWindow();
  await popToRoot();
}
