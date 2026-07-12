import { showHUD } from "@raycast/api";
import { focusSource, getMediaSources } from "./core/mediaService";
import { registerAllProviders } from "./core/setup";

registerAllProviders();

export default async function Command(): Promise<void> {
  const { sources } = await getMediaSources();
  const target = sources[0];
  if (!target) {
    await showHUD("No active media source");
    return;
  }
  await focusSource(target);
  await showHUD(`Opened ${target.appName}`);
}
