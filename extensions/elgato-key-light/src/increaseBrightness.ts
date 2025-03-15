import { KeyLight } from "./elgato";
import { showToast, Toast } from "@raycast/api";

const command = async () => {
  try {
    const keyLight = await KeyLight.discover();
    try {
      const brightness = await keyLight.increaseBrightness();

      await showToast({
        style: Toast.Style.Success,
        title:
          brightness !== undefined
            ? `Brightness: ${brightness.toLocaleString("en", { maximumFractionDigits: 0 })}%`
            : "Brightness increased",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to increase brightness",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to discover Key Lights",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default command;
