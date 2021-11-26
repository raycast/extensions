import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureToast } from "./utils";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    await keyLight.increaseTemperature();
    await showHUD(`Increased color temperature`);
  } catch (error) {
    await showFailureToast(error, "Failed increasing color temperature");
  }
};
