import { showHUD, updateCommandMetadata } from "@raycast/api";
import { togglePreviewLabel } from "./utils";

export default async function Command() {
  try {
    const isOn = await togglePreviewLabel();
    await updateCommandMetadata({ subtitle: isOn ? "On" : "Off" });
    await showHUD(`Preview Label: ${isOn ? "On" : "Off"}`);
  } catch {
    // Error handled by utils
  }
}
