import { showToast, Toast } from "@raycast/api";
import { KeyLight } from "./elgato";

const command = async () => {
  try {
    const keyLight = await KeyLight.discover();
    try {
      const temperature = await keyLight.increaseTemperature();

      await showToast({
        style: Toast.Style.Success,
        title: temperature !== undefined ? `Temperature: ${temperature}K` : "Temperature increased",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to increase temperature",
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
