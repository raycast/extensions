import { showHUD, updateCommandMetadata } from "@raycast/api";
import { toggleActiveLabel } from "./utils";

export default async function Command() {
  try {
    const isOn = await toggleActiveLabel();
    await updateCommandMetadata({ subtitle: isOn ? "On" : "Off" });
    await showHUD(`Active Label: ${isOn ? "On" : "Off"}`);
  } catch {
    // Error handled by utils
  }
}
