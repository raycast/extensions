import { KeyLight } from "./elgato";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const command = async () => {
  try {
    const keyLight = await KeyLight.discover();
    try {
      const brightness = await keyLight.decreaseBrightness();

      await showToast({
        style: Toast.Style.Success,
        title:
          brightness !== undefined
            ? `Brightness: ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
            : "Brightness decreased",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to decrease brightness" });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
