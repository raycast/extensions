import { showHUD } from "@raycast/api";
import { controlSource, getMediaSources } from "./core/mediaService";
import { registerAllProviders } from "./core/setup";
import { refreshMenuBar } from "./lib/refreshMenuBar";

registerAllProviders();

export default async function Command(): Promise<void> {
  const { sources } = await getMediaSources();
  const target = sources[0];
  if (!target) {
    await showHUD("No active media source");
    return;
  }
  await controlSource(target, "next");
  await showHUD("Next track");
  await refreshMenuBar();
}
