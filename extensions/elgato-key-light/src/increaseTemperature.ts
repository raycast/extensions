import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    await keyLight.increaseTemperature();
    await showHUD(`Increased color temperature`);
  } catch (error) {
    await showHUD("❌ Failed increasing color temperature");
    console.error("Failed increasing color temperature", error);
  }
};
