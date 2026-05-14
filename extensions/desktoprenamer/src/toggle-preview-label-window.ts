import { showHUD } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle preview label", "Failed to toggle preview label");
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Preview Label: ${status}`);
  } catch {
    // Error handled by utils
  }
}
