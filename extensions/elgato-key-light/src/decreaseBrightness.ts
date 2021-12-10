import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureHUD } from "./utils";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    const brightness = await keyLight.decreaseBrightness();
    const formattedBrightness = brightness.toLocaleString("en", { maximumFractionDigits: 0 });
    await showHUD(`Decreased brightness to ${formattedBrightness}%`);
  } catch (error) {
    await showFailureHUD("Failed decreasing brightness");
  }
};
