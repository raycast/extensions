import { showHUD } from "@raycast/api";
import { cycleSource, shouldShowHud } from "./lib/input-source";

// Leaves the Raycast window alone so the hotkey works inside Raycast too — see
// the note in switch-slot.ts.
export default async function Command() {
  try {
    const { name } = await cycleSource();
    if (shouldShowHud()) {
      await showHUD(name);
    }
  } catch (error) {
    await showHUD(
      `Could not switch: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
