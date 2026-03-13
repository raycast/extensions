import { getLatestDownload, hasAccessToDownloadsFolder, deleteFileOrFolder } from "./utils";
import { popToRoot, showHUD } from "@raycast/api";
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
  await popToRoot();
}
