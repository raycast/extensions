import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRadio, setRadio } from "./bluetooth";

export default async function Command() {
  try {
    const next = (await getRadio()) === "On" ? "Off" : "On";
    await setRadio(next);
    await showHUD(next === "On" ? "Bluetooth On" : "Bluetooth Off");
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle Bluetooth" });
  }
}
