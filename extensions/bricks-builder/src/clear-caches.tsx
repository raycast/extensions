import { runTool, runOnSelectedSite } from "./lib/site-tools";

/** Runs on the site last picked in any Bricks command; give it a hotkey. */
export default async function Command() {
  await runOnSelectedSite("Clearing caches", (site) => runTool(site, "clear-cache"));
}
