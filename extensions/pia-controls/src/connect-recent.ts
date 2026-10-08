import { closeMainWindow, showHUD } from "@raycast/api";
import { connectToRegion, loadRecents } from "./lib/actions";

export default async function Command() {
  const recents = await loadRecents();
  const region = recents[0];
  if (!region) {
    await closeMainWindow({ clearRootSearch: true });
    await showHUD("No recent region yet — connect once first");
    return;
  }
  await connectToRegion(region);
}
