import { showHUD, Clipboard } from "@raycast/api";
import { getExtendedTrackMetadata } from "./helpers/swinsian";

export default async function Command() {
  const meta = await getExtendedTrackMetadata();
  if (!meta) {
    await showHUD("Nothing is playing");
    return;
  }
  await Clipboard.copy(JSON.stringify(meta, null, 2));
  await showHUD("JSON metadata copied");
}
