import { showHUD } from "@raycast/api";
import { nightLightTemperature, nightLightBrightness, validateBrightness, validateTemperature } from "./lib/utils";
import { executeCommand } from "./lib/commands";

export default async function Main() {
  const error =
    validateBrightness(nightLightBrightness(), "Night light brightness") ||
    validateTemperature(nightLightTemperature(), "Night light temperature");
  if (error) {
    await showHUD(error);
    return;
  }

  await executeCommand(
    ["on", "--temperature", nightLightTemperature(), "--brightness", nightLightBrightness()],
    "Error turning on light",
  );
}
