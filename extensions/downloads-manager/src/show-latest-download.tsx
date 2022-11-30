import { showHUD, showInFinder } from "@raycast/api";
import { getDownloads } from "./utils";

export default async function main() {
  const downloads = getDownloads();

  if (downloads.length < 1) {
    await showHUD("No downloads found");
    return;
  }

  const latestDownload = downloads[0];
  await showInFinder(latestDownload.path);
}
