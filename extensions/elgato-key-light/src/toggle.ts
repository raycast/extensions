import { KeyLight } from "./elgato";
import { showHUD } from "@raycast/api";
import { discoverKeyLights } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    if (!keyLight) {
      await showHUD("No Key Lights found");
      return;
    }

    try {
      const isOn = await keyLight.toggle();
      await showHUD(isOn ? "Key Light turned on" : "Key Light turned off");
    } catch (error) {
      await showHUD(`Failed to toggle Key Light: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  } catch (error) {
    await showHUD(`Failed to discover Key Lights: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export default command;
