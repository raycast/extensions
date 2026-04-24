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

  // Close the main window before running the deletion so that when this
  // command is launched via a deeplink (e.g. `open -g raycast://...`), Raycast
  // doesn't get pulled into focus to render the success toast. With the window
  // closed, `showToast` inside `deleteFileOrFolder` falls back to `showHUD`.
  await closeMainWindow();

  try {
    await deleteFileOrFolder(latestDownload.path);
  } catch (error) {
    await showFailureToast(error, { title: "Deletion Failed" });
  }
  await popToRoot();
}
