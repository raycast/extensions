import { showHUD, Clipboard } from "@raycast/api";
import { getPlayerStatus } from "./helpers/swinsian";

export default async function CopyTrackInfo() {
  const status = await getPlayerStatus();
  if (!status.track) {
    await showHUD("Nothing is playing");
    return;
  }
  const { name, artist } = status.track;
  await Clipboard.copy(`${artist} – ${name}`);
  await showHUD("Copied: " + artist + " – " + name);
}
