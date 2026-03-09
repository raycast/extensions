import { showHUD } from "@raycast/api";
import { runDesktopRenamerCommand } from "./utils";

export default async function Command() {
  try {
    const result = await runDesktopRenamerCommand("toggle menubar", "Failed to toggle menubar item");
    const status = result === "true" ? "Visible" : "Hidden";
    await showHUD(`Menubar Item: ${status}`);
  } catch {
    // Error handled by utils
  }
}
