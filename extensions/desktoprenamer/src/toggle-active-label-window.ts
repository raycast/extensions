import { showHUD, updateCommandMetadata } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle active label", "Failed to toggle active label");
    const isOn = result === "true";
    await updateCommandMetadata({ subtitle: isOn ? "On" : "Off" });
    await showHUD(`Active Label: ${isOn ? "On" : "Off"}`);
  } catch {
    // Error handled by utils
  }
}
