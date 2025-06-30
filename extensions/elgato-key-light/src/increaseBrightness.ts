import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    try {
      const brightness = await keyLight.increaseBrightness();

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
