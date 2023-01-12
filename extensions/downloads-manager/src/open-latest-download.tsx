import { getLatestDownload } from "./utils";
import { open, popToRoot, showHUD } from "@raycast/api";

export default async function main() {
  const latestDownload = await getLatestDownload();
  if (latestDownload === undefined) {
    await showHUD("No downloads found");
    return;
  }

  await open(latestDownload.path);
  await popToRoot();
}
