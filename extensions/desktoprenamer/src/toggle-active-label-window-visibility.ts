import { showHUD } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle desktop visibility", "Failed to toggle desktop visibility");
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Desktop Label: ${status}`);
  } catch {
    // Error handled by utils
  }
}
