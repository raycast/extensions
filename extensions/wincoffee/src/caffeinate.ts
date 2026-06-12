import { showHUD, closeMainWindow } from "@raycast/api";
import { startCaffeinate } from "./utils";

export default async function main() {
  await closeMainWindow();
  try {
    await startCaffeinate("indefinite");
    await showHUD("Caffeination started");
  } catch (error) {
    await showHUD(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
