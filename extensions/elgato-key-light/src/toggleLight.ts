import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    try {
      const isOn = await keyLight.toggle();

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
