import { showToast, Toast, open, environment, LaunchType, getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { SPACE_API_ERROR_CODES, SpaceAPIProtocolError } from "./contract";

export type CommunicationMethod = "automatic" | "spaceapi" | "applescript";

const DESKTOP_RENAMER_BUNDLE_IDENTIFIERS = ["dev.mqiu.DesktopRenamer", "com.michaelqiu.DesktopRenamer"] as const;

let installedApplicationLookup: Promise<boolean> | null = null;

export function communicationMethod(): CommunicationMethod {
  const value = getPreferenceValues<{ communicationMethod?: CommunicationMethod }>().communicationMethod;
  return value === "spaceapi" || value === "applescript" ? value : "automatic";
}

export async function isDesktopRenamerInstalled(): Promise<boolean> {
  if (!installedApplicationLookup) {
    installedApplicationLookup = getApplications()
      .then((applications) =>
        applications.some((app) => DESKTOP_RENAMER_BUNDLE_IDENTIFIERS.some((bundleID) => bundleID === app.bundleId)),
      )
      .then((isInstalled) => {
        if (!isInstalled) installedApplicationLookup = null;
        return isInstalled;
      })
      .catch((error) => {
        installedApplicationLookup = null;
        throw error;
      });
  }
  return installedApplicationLookup;
}

export async function requireDesktopRenamerInstalled(): Promise<void> {
  if (!(await isDesktopRenamerInstalled())) throw new Error("NotInstalled");
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
    } else if (error instanceof Error && error.message === "NotRunning") {
      await showToast({
        style: Toast.Style.Failure,
        title: "DesktopRenamer Not Running",
        message: "Open DesktopRenamer to use this command.",
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
    } else if (
      (error instanceof SpaceAPIProtocolError && error.code === SPACE_API_ERROR_CODES.apiDisabled) ||
      (error instanceof Error && error.message.includes("API Disabled"))
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "SpaceAPI Disabled",
        message: "Enable SpaceAPI in DesktopRenamer settings.",
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
    } else {
      const message = error instanceof Error ? error.message : errorMessage;
      await showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: message || errorMessage,
      });
    }
  }
}
