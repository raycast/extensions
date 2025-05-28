import { showToast, Toast } from "@raycast/api";
import { internalToKelvin } from "./elgato";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    try {
      const temperature = await keyLight.decreaseTemperature();

      await showToast({
        style: Toast.Style.Success,
        title:
          typeof temperature === "number"
            ? `Temperature: ${internalToKelvin(temperature).toLocaleString("en", { maximumFractionDigits: 0 })}K`
            : "Temperature decreased",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to decrease temperature" });
    }
  } catch (error) {
    showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
