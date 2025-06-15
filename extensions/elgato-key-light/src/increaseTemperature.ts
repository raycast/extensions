import { internalToKelvin } from "./elgato";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverKeyLights } from "./utils";

const command = async () => {
  try {
    const keyLight = await discoverKeyLights();
    try {
      const temperature = await keyLight.increaseTemperature();

      await showToast({
        style: Toast.Style.Success,
        title:
          typeof temperature === "number"
            ? `Temperature: ${internalToKelvin(temperature).toLocaleString("en", { maximumFractionDigits: 0 })}K`
            : "Temperature increased",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to increase temperature" });
    }
  } catch (error) {
    showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
