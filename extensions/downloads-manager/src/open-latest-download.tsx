import { getLatestDownload } from "./utils";
import { open, popToRoot, showHUD } from "@raycast/api";

export default async function main() {
  const latestDownload = getLatestDownload();
  if (!latestDownload) {
    await showHUD("No downloads found");
    return;
  }

  await open(latestDownload.path);
  await popToRoot();
}
