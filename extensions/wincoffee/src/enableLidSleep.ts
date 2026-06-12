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

    await setLidSleepState(false, false); // Enable sleep (disable the 'disable' flag)
    await showHUD("Lid sleep enabled");
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
