import { popToRoot, showHUD, Clipboard, closeMainWindow } from "@raycast/api";
import { getLatestDownload, hasAccessToDownloadsFolder } from "./utils";

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

  await Clipboard.paste({ file: download.path });

  await closeMainWindow();
  await showHUD("Pasted latest download");
  await popToRoot();
}
