import { showHUD } from "@raycast/api";
import { defaultTemperature, defaultBrightness, validateBrightness, validateTemperature } from "./lib/utils";
import { executeCommand } from "./lib/commands";

export default async function Main() {
  const error =
    validateBrightness(defaultBrightness(), "Default brightness") ||
    validateTemperature(defaultTemperature(), "Default temperature");
  if (error) {
    await showHUD(error);
    return;
  }

  await executeCommand(
    ["on", "--temperature", defaultTemperature(), "--brightness", defaultBrightness()],
    "Error turning on light",
  );
}
