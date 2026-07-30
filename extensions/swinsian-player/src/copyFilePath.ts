import { showHUD, Clipboard } from "@raycast/api";
import { getPlayerStatus } from "./helpers/swinsian";

export default async function CopyFilePath() {
  const status = await getPlayerStatus();
  if (!status.track) {
    await showHUD("Nothing is playing");
    return;
  }
  await Clipboard.copy(status.track.path);
  await showHUD("Path copied");
}
