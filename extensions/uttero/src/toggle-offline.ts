import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { sendUtteroCommand, isUtteroRunning } from "./utils/command";

export default async function main() {
  if (!isUtteroRunning()) {
    await showToast({ style: Toast.Style.Failure, title: "Uttero is not running", message: "Start Uttero first." });
    return;
  }
  try {
    sendUtteroCommand("toggle-offline");
    await closeMainWindow();
    await showHUD("Offline mode toggled");
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to toggle offline mode", message: "Check Uttero is running." });
  }
}
