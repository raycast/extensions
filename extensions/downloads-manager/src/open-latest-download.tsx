import { getLatestDownload, hasAccessToDownloadsFolder } from "./utils";
import { open, popToRoot, showHUD } from "@raycast/api";

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

  await open(latestDownload.path);
  await popToRoot();
}
