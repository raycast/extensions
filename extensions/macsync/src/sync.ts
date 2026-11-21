import { showHUD } from "@raycast/api";
import { failure, macsync } from "./run";

export default async function Command() {
  try {
    const overview = JSON.parse(await macsync("sync", "--json"));
    const waiting = overview.dockPlan || overview.missingApps.length > 0;
    await showHUD(waiting ? "Synced. Changes are ready to review." : "Synced. Your Macs match.");
  } catch (e) {
    await showHUD(failure(e));
  }
}
