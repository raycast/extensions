import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights, getTargetLightNames } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    const targets = await getTargetLightNames();
    try {
      const brightness = await keyLight.increaseBrightness(targets);

      await showToast({
        style: Toast.Style.Success,
        title:
          typeof brightness === "number"
            ? `Brightness: ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
            : "Brightness increased",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to increase brightness" });
    }
  } catch (error) {
    showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
