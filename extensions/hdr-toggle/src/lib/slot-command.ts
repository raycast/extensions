import { showHUD } from "@raycast/api";
import { listMonitors, toggleHdr } from "./hdr";
import { getSlot } from "./slots";

/**
 * Shared implementation for the no-view "Toggle HDR – Shortcut N" commands.
 * Reads the monitor bound to the slot, toggles its HDR, and reports via HUD.
 */
export async function runSlot(slot: number): Promise<void> {
  const assignment = await getSlot(slot);
  if (!assignment) {
    await showHUD(
      `HDR Shortcut ${slot} is not assigned — open “Toggle HDR” to assign a monitor`,
    );
    return;
  }

  try {
    const monitors = await listMonitors();
    const monitor = monitors.find((m) => m.id === assignment.id);
    if (!monitor) {
      await showHUD(
        `${assignment.name} isn't connected (HDR Shortcut ${slot})`,
      );
      return;
    }
    const enabled = await toggleHdr(assignment.id);
    await showHUD(`${assignment.name}: HDR ${enabled ? "on" : "off"}`);
  } catch (error) {
    await showHUD(
      `Failed to toggle HDR: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
