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

    await setLidSleepState(true, true); // Disable sleep (enable the 'disable' flag)
    await showHUD("Lid sleep disabled");
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
