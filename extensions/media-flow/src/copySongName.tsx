import { Clipboard, showHUD } from "@raycast/api";
import { getMediaSources } from "./core/mediaService";
import { registerAllProviders } from "./core/setup";

registerAllProviders();

export default async function Command(): Promise<void> {
  const { sources } = await getMediaSources();
  const target = sources[0];
  if (!target) {
    await showHUD("No active media source");
    return;
  }
  const text = target.artist
    ? `${target.title} — ${target.artist}`
    : target.title;
  await Clipboard.copy(text);
  await showHUD(`Copied: ${text}`);
}
