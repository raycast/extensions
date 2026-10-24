import { toggleMaintenanceMode, runOnSelectedSite } from "./lib/site-tools";

/** Runs on the site last picked in any Bricks command; give it a hotkey. */
export default async function Command() {
  await runOnSelectedSite("Toggling maintenance mode", (site) => toggleMaintenanceMode(site));
}
