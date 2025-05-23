import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    try {
      const brightness = await keyLight.decreaseBrightness();

      await showToast({
        style: Toast.Style.Success,
        title:
          typeof brightness === "number"
            ? `Brightness: ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
            : "Brightness decreased",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to decrease brightness" });
    }
  } catch (error) {
    showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
