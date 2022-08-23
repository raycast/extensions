import { open, showHUD } from "@raycast/api";
import { getDownloads } from "./utils";

export default async function main() {
  const downloads = getDownloads();

  if (downloads.length < 1) {
    await showHUD("No downloads found");
    return;
  }

  const lastDownload = downloads[0];
  await open(lastDownload.path);
}
