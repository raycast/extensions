import { getLatestDownload, hasAccessToDownloadsFolder, deleteFileOrFolder } from "./utils";
import { popToRoot, showHUD } from "@raycast/api";

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

  await deleteFileOrFolder(latestDownload.path);
  await popToRoot();
}
