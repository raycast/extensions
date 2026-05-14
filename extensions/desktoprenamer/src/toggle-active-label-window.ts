import { showHUD } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle active label", "Failed to toggle active label");
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Active Label: ${status}`);
  } catch {
    // Error handled by utils
  }
}
