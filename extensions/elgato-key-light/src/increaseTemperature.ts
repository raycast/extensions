import { showToast, Toast } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureToast } from "@raycast/utils";
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
      await showFailureToast(error, { title: "Failed to increase temperature" });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to discover Key Lights" });
  }
};

export default command;
