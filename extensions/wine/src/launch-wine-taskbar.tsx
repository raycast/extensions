import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { spawn } from "child_process";
import { detectWinePath } from "./utils/wine";

/**
 * Command that launches Wine's Windows desktop in taskbar mode
 */
export default async function Command() {
  try {
    // Get the correct Wine binary path
    const wineCmd = await detectWinePath();
    if (!wineCmd) {
      throw new Error("Wine binary not found. Please check your configuration.");
    }

    // Launch Wine explorer in desktop mode with shell option
    spawn(wineCmd, ["explorer", "/desktop=shell"], {
      detached: true, // Allows the process to continue running after the extension exits
      stdio: "ignore", // Suppress stdout/stderr
    }).unref();

    // Close the Raycast window once the command is executed
    await closeMainWindow();
  } catch (err) {
    // Show error toast if anything fails
    const message = err instanceof Error ? err.message : String(err);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Start Wine Desktop",
      message,
    });
  }
}
