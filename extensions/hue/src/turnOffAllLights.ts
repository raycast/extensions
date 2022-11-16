import { closeMainWindow, showHUD } from "@raycast/api";
import { turnOffAllLights } from "./lib/hue";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./lib/errors";

export default async () => {
  try {
    await closeMainWindow();
    await turnOffAllLights();
    await showHUD("Turned off all lights");
  } catch (error) {
    if (error instanceof NoHueBridgeConfiguredError) return showHUD("No Hue bridge configured");
    if (error instanceof CouldNotConnectToHueBridgeError) return showHUD("Could not connect to the Hue bridge");
    return showHUD("Failed turning off all lights");
  }
};
