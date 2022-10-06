import { showHUD, closeMainWindow } from "@raycast/api";
import { getDownloads, revealFile } from "./utils";

export default async function main() {
  const downloads = getDownloads();

  if (downloads.length < 1) {
    await showHUD("No downloads found");
    return;
  }

  const latestDownload = downloads[0];

  try {
    revealFile(latestDownload.path);
  } catch (error: any) {
    await showHUD(`Could not reveal the file: ${error.message}`);
  }

  closeMainWindow();
}
