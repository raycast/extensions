import { showHUD, closeMainWindow } from "@raycast/api";
import { getCaffeinateState, startCaffeinate, stopCaffeinate } from "./utils";

export default async function main() {
  await closeMainWindow();
  try {
    const state = await getCaffeinateState();
    if (state.active) {
      await stopCaffeinate();
      await showHUD("Caffeination stopped");
    } else {
      await startCaffeinate("indefinite");
      await showHUD("Caffeination started");
    }
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
