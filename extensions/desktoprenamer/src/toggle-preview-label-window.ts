import { showHUD, updateCommandMetadata } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle preview label", "Failed to toggle preview label");
    const isOn = result === "true";
    await updateCommandMetadata({ subtitle: isOn ? "On" : "Off" });
    await showHUD(`Preview Label: ${isOn ? "On" : "Off"}`);
  } catch {
    // Error handled by utils
  }
}
