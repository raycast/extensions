import { showToast, Toast, open, environment, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function checkDesktopRenamerRunning(): Promise<boolean> {
  try {
    const isRunning = await runAppleScript(
      'tell application "System Events" to return (name of processes) contains "DesktopRenamer"',
    );
    return isRunning === "true";
  } catch {
    return false;
  }
}

export async function runDesktopRenamerCommand(command: string, errorMessage = "Is DesktopRenamer running?") {
  try {
    const isRunning = await checkDesktopRenamerRunning();
    if (!isRunning) {
      throw new Error("DesktopRenamer is not running");
    }
    return await runAppleScript(`tell application "DesktopRenamer" to ${command}`);
  } catch (error) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: errorMessage,
        primaryAction: {
          title: "Open DesktopRenamer",
          onAction: async () => {
            try {
              await open("/Applications/DesktopRenamer.app");
            } catch {
              await showToast({ style: Toast.Style.Failure, title: "Failed to launch app" });
            }
          },
        },
      });
    }
    throw error;
  }
}
