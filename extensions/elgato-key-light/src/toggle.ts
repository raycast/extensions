import { closeMainWindow, showHUD } from "@raycast/api";
import { KeyLight } from "./elgato";
import { showFailureToast } from "./utils";

export default async () => {
  try {
    await closeMainWindow();
    const keyLight = await KeyLight.discover();
    const isOn = await keyLight.toggle();
    await showHUD(isOn ? "Key Light turned on" : "Key Light turned off");
  } catch (error) {
    await showFailureToast(error);
  }
};
