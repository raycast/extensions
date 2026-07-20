import { showHUD, updateCommandMetadata } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle desktop visibility", "Failed to toggle desktop visibility");
    const isOn = result === "true";
    await updateCommandMetadata({ subtitle: isOn ? "On" : "Off" });
    await showHUD(`Desktop Label: ${isOn ? "On" : "Off"}`);
  } catch {
    // Error handled by utils
  }
}
