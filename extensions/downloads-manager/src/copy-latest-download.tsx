import { popToRoot, showHUD } from "@raycast/api";
import { getLatestDownload, hasAccessToDownloadsFolder as hasAccessToDownloadsFolder } from "./utils";
import { Clipboard } from "@raycast/api";
import { closeMainWindow } from "@raycast/api";

export default async function main() {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  const download = getLatestDownload();
  if (!download) {
    await showHUD("No downloads found");
    return;
  }

  await Clipboard.copy({ file: download.path });

  await closeMainWindow();
  await showHUD("Copied latest download to clipboard");
  await popToRoot();
}
