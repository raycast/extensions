import { showToast, Toast, open, environment, LaunchType, getApplications } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function isDesktopRenamerInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some((app) => app.bundleId === "com.michaelqiu.DesktopRenamer");
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

export async function handleDesktopRenamerError(error: unknown, errorMessage = "Is DesktopRenamer running?") {
  if (environment.launchType === LaunchType.UserInitiated) {
    if (error instanceof Error && error.message === "NotInstalled") {
      await showToast({
        style: Toast.Style.Failure,
        title: "DesktopRenamer Not Installed",
        message: "Please install DesktopRenamer to use this command.",
        primaryAction: {
          title: "Download App",
          onAction: () => open("https://github.com/gitmichaelqiu/DesktopRenamer"),
        },
      });
    } else {
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
  }
}

export async function runDesktopRenamerScript(scriptContent: string, errorMessage = "Is DesktopRenamer running?") {
  try {
    const isInstalled = await isDesktopRenamerInstalled();
    if (!isInstalled) {
      throw new Error("NotInstalled");
    }

    const isRunning = await checkDesktopRenamerRunning();
    if (!isRunning) {
      throw new Error("NotRunning");
    }
    return await runAppleScript(scriptContent);
  } catch (error) {
    await handleDesktopRenamerError(error, errorMessage);
    throw error;
  }
}

export async function runDesktopRenamerCommand(command: string, errorMessage = "Is DesktopRenamer running?") {
  return await runDesktopRenamerScript(`tell application "DesktopRenamer" to ${command}`, errorMessage);
}
