import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    const brightness = await keyLight.decreaseBrightness();
    const formattedBrightness = brightness.toLocaleString("en", { maximumFractionDigits: 0 });
    await showHUD(`Decreased brightness to ${formattedBrightness}%`);
  } catch (error) {
    await showHUD("❌ Failed decreasing brightness");
    console.error("Failed decreasing brightness", error);
  }
};
