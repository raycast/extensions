import { showHUD, closeMainWindow } from "@raycast/api";
import { getLidSleepState, setLidSleepState } from "./utils";

export default async function main() {
  await closeMainWindow();
  try {
    const state = await getLidSleepState();
    if (!state.supported) {
      await showHUD("Lid settings are unsupported on this device");
      return;
    }

    // Toggle: if either sleep is currently enabled, disable them (set to Do nothing).
    // Otherwise, enable sleep (set to Sleep).
    const currentlySleep = !state.acSleepDisabled || !state.dcSleepDisabled;
    const shouldDisable = currentlySleep;

    await setLidSleepState(shouldDisable, shouldDisable);

    if (shouldDisable) {
      await showHUD("Lid sleep disabled");
    } else {
      await showHUD("Lid sleep enabled");
    }
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
