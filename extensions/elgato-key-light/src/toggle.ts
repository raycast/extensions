import { showHUD } from "@raycast/api";
import { discoverKeyLights, getTargetLightNames } from "./utils";
import { showFailureToast } from "@raycast/utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    const targets = await getTargetLightNames();
    if (!keyLight) {
      await showHUD("No Key Lights found");
      return;
    }

    try {
      const isOn = await keyLight.toggle(targets);
      await showHUD(isOn ? "Key Light turned on" : "Key Light turned off");
    } catch (error) {
      showFailureToast(error, { title: "Failed to toggle Key Light" });
    }
  } catch (error) {
    await showHUD(`Failed to discover Key Lights: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export default command;
