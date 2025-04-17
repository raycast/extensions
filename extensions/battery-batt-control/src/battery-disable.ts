import { showHUD } from "@raycast/api";
import { disableBatteryOptimization } from "./utils/batt_utils";

export default async function Command() {
  try {
    await disableBatteryOptimization();
    await showHUD("Battery optimization disabled successfully");
  } catch (error) {
    console.error("Error disabling battery optimization:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showHUD(`Error: ${errorMessage}`);
  }
}
