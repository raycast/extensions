import { popToRoot, showHUD, Clipboard, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLatestDownload, hasAccessToDownloadsFolder } from "./utils";

export default async function main() {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  let download;
  try {
    download = getLatestDownload();
  } catch (error) {
    await showFailureToast(error, { title: "Could not get latest download" });
    return;
  }

  if (!download) {
    await showHUD("No downloads found");
    return;
  }

  try {
    await Clipboard.paste({ file: download.path });
    await closeMainWindow();
    await showHUD("Pasted latest download");
    await popToRoot();
  } catch (error) {
    await showFailureToast(error, { title: "Could not paste download" });
  }
}
