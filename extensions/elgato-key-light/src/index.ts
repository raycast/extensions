import { showHUD } from "@raycast/api";
import { findKeyLight, toggleKeyLight } from "./elgato";
import { showFailureToast } from "./utils";

export default async () => {
  try {
    const keyLight = await findKeyLight();
    const isOn = await toggleKeyLight(keyLight);
    await showHUD(isOn ? "Key Light turned on" : "Key Light turned off");
  } catch (error) {
    await showFailureToast(error);
  }
};
