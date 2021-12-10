import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    await keyLight.decreaseTemperature();
    await showHUD(`Decreased color temperature`);
  } catch (error) {
    await showHUD("❌ Failed decreasing color temperatur");
    console.error("Failed decreasing color temperatur", error);
  }
};
