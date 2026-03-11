import { showHUD } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle labels", "Failed to toggle labels");
    const status = result === "true" ? "Enabled" : "Disabled";
    await showHUD(`Labels: ${status}`);
  } catch {
    // Error handled by utils
  }
}
