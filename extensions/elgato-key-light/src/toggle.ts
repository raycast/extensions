import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    const isOn = await keyLight.toggle();
    await showHUD(isOn ? "Key Light turned on" : "Key Light turned off");
  } catch (error) {
    await showHUD("❌ Failed toggling Key Light");
    console.error("Failed toggling Key Light", error);
  }
};
