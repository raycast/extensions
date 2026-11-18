import { popToRoot, showHUD, showInFinder, closeMainWindow } from "@raycast/api";
import { getLatestDownloadAsync, hasAccessToDownloadsFolder } from "./utils";

export default async function main() {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  const latestDownload = await getLatestDownloadAsync();
  if (!latestDownload) {
    await showHUD("No downloads found");
    return;
  }

  await showInFinder(latestDownload.path);
  await closeMainWindow();
  await popToRoot();
}
