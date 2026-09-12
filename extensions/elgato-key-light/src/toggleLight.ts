import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights, getTargetLightNames } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    const targets = await getTargetLightNames();
    try {
      const isOn = await keyLight.toggle(targets);

      await showToast({
        style: Toast.Style.Success,
        title: isOn ? "Light turned on" : "Light turned off",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to toggle light" });
    }
  } catch (error) {
    showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
