import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureToast } from "./utils";

export default async () => {
  try {
    await closeMainWindow();

    const keyLight = await KeyLight.discover();
    await keyLight.decreaseTemperature();

    await showHUD(`Decreased color temperature`);
  } catch (error) {
    await showFailureToast(error, "Failed decreasing color temperature");
  }
};
