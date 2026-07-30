import { showHUD, Clipboard } from "@raycast/api";
import { getExtendedTrackMetadata, formatMetadataMarkdown } from "./helpers/swinsian";

export default async function Command() {
  const meta = await getExtendedTrackMetadata();
  if (!meta) {
    await showHUD("Nothing is playing");
    return;
  }
  await Clipboard.copy(formatMetadataMarkdown(meta));
  await showHUD("Markdown report copied");
}
