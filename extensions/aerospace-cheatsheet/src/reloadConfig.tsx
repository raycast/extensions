import { showHUD } from "@raycast/api";
import { aerospace } from "./lib/config";

/**
 * Re-read aerospace.toml. Checks the config parses before applying it, so a typo
 * surfaces as a message rather than as a window manager that quietly stopped working.
 */
export default async function Command() {
  try {
    await aerospace("reload-config", "--dry-run");
  } catch (e) {
    const detail = e instanceof Error ? e.message.split("\n").slice(-3).join(" ") : String(e);
    await showHUD(`Config has errors, not reloaded: ${detail}`);
    return;
  }
  try {
    await aerospace("reload-config");
    await showHUD("AeroSpace config reloaded");
  } catch (e) {
    await showHUD(`Couldn't reload: ${e instanceof Error ? e.message : String(e)}`);
  }
}
