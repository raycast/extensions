import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import {
  Slot,
  resolveSlot,
  selectSource,
  shouldShowHud,
} from "./lib/input-source";

/**
 * Shared body for the four slot commands.
 *
 * Deliberately does not close the Raycast window, so the hotkey also works while
 * you are typing in Raycast's own search field. The Swift side still waits for
 * Raycast to stop being frontmost before switching, which keeps the switch
 * landing in your app when the hotkey is pressed from elsewhere.
 */
export async function switchToSlot(slot: Slot) {
  try {
    const id = await resolveSlot(slot);
    if (!id) {
      await showHUD(`Layout ${slot} is unassigned`);
      await launchCommand({
        name: "configure",
        type: LaunchType.UserInitiated,
      });
      return;
    }

    const { name } = await selectSource(id);
    if (shouldShowHud()) {
      await showHUD(name);
    }
  } catch (error) {
    await showHUD(
      `Could not switch: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
