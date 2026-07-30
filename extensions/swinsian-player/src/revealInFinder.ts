import { showHUD } from "@raycast/api";
import { getPlayerStatus, revealInFinder } from "./helpers/swinsian";

export default async function RevealInFinder() {
  const status = await getPlayerStatus();
  if (!status.track) {
    await showHUD("Nothing is playing");
    return;
  }
  await revealInFinder(status.track.path);
}
