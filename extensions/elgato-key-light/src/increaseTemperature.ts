import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureHUD } from "./utils";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    await keyLight.increaseTemperature();
    await showHUD(`Increased color temperature`);
  } catch (error) {
    await showFailureHUD("Failed increasing color temperature");
  }
};
