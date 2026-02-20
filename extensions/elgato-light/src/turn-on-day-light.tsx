import { showHUD } from "@raycast/api";
import { dayLightTemperature, dayLightBrightness, validateBrightness, validateTemperature } from "./lib/utils";
import { executeCommand } from "./lib/commands";

export default async function Main() {
  const error =
    validateBrightness(dayLightBrightness(), "Day light brightness") ||
    validateTemperature(dayLightTemperature(), "Day light temperature");
  if (error) {
    await showHUD(error);
    return;
  }

  await executeCommand(
    ["on", "--temperature", dayLightTemperature(), "--brightness", dayLightBrightness()],
    "Error turning on light",
  );
}
