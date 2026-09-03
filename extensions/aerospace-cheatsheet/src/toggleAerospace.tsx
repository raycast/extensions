import { showHUD } from "@raycast/api";
import { toggleAerospace } from "./lib/workspaces";

/**
 * Pause or resume tiling. Handy before screen sharing, or for an app that fights the
 * tiler, without having to remember whether it is currently on.
 */
export default async function Command() {
  try {
    const state = await toggleAerospace();
    await showHUD(state === "enabled" ? "AeroSpace tiling on" : "AeroSpace tiling off");
  } catch (e) {
    await showHUD(`Couldn't toggle AeroSpace: ${e instanceof Error ? e.message : String(e)}`);
  }
}
