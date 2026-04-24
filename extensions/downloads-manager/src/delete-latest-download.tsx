import { getLatestDownload, hasAccessToDownloadsFolder, deleteFileOrFolder } from "./utils";
import { closeMainWindow, getPreferenceValues, popToRoot, showHUD } from "@raycast/api";
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

  const { deletionBehavior } = getPreferenceValues();

  // For trash, close the window immediately so Raycast never surfaces when
  // launched via deeplink (e.g. `open -g raycast://...`). For permanent
  // delete we must keep it open so the confirmAlert inside deleteFileOrFolder
  // can be shown, then close afterwards.
  if (deletionBehavior === "trash") {
    await closeMainWindow();
  }

  try {
    await deleteFileOrFolder(latestDownload.path);
  } catch (error) {
    await showFailureToast(error, { title: "Deletion Failed" });
  }

  if (deletionBehavior !== "trash") {
    await closeMainWindow();
  }
  await popToRoot();
}
