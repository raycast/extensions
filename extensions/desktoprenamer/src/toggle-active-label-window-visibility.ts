import { showHUD, updateCommandMetadata } from "@raycast/api";
import { toggleDesktopVisibility } from "./utils";

export default async function Command() {
  try {
    const isOn = await toggleDesktopVisibility();
    await updateCommandMetadata({ subtitle: isOn ? "On" : "Off" });
    await showHUD(`Desktop Label: ${isOn ? "On" : "Off"}`);
  } catch {
    // Error handled by utils
  }
}
