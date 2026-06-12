import { showHUD, closeMainWindow } from "@raycast/api";
import { stopCaffeinate } from "./utils";

export default async function main() {
  await closeMainWindow();
  try {
    await stopCaffeinate();
    await showHUD("Caffeination stopped");
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
