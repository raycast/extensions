import { showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export async function runDesktopRenamerCommand(command: string, errorMessage = "Is DesktopRenamer running?") {
  try {
    return await runAppleScript(`tell application "DesktopRenamer" to ${command}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Command Failed",
      message: errorMessage,
      primaryAction: {
        title: "Open DesktopRenamer",
        onAction: () => open("DesktopRenamer.app"),
      },
    });
    throw error;
  }
}
