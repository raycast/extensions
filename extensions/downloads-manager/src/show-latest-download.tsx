import { showHUD, showInFinder } from "@raycast/api";
import { getLatestDownload } from "./utils";

export default async function main() {
  const download = getLatestDownload();

  if (!download) {
    await showHUD("No downloads found");
    return;
  }

  await showInFinder(download.path);
}
