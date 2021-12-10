import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    const brightness = await keyLight.increaseBrightness();
    const formattedBrightness = brightness.toLocaleString("en", { maximumFractionDigits: 0 });
    await showHUD(`Increased brightness to ${formattedBrightness}%`);
  } catch (error) {
    await showHUD("❌ Failed increasing brightness");
    console.error("Failed increasing brightness", error);
  }
};
