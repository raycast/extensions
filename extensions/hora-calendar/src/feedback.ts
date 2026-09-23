import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { HORA_DIRECT_DOWNLOAD, HOMEBREW_INSTALL_COMMAND } from "./hora-required";
import { HoraNotAuthorizedError, HoraNotInstalledError, HoraOutdatedError } from "./hora";

/**
 * One place that turns a thrown error into a toast, so every command explains
 * the two failures a person can actually do something about — hora missing,
 * and macOS not letting Raycast talk to it — instead of showing raw
 * osascript output.
 */
export async function showFailure(error: unknown, title = "Something went wrong") {
  // The commands that run without a view cannot show the full pitch that
  // `HoraRequired` does, so the toast carries the short version of it.
  if (error instanceof HoraNotInstalledError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "hora Calendar for Mac required",
      message: "Native Google Calendar for Mac. Direct is recommended; Setapp is also available.",
      primaryAction: {
        title: "Get hora Calendar Direct",
        onAction: () => {
          open(HORA_DIRECT_DOWNLOAD);
        },
      },
    });
    return;
  }

  if (error instanceof HoraOutdatedError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Update hora Calendar",
      message: "Raycast support arrived in hora 1.1.5. Update Direct or Setapp; the Mac App Store update is pending.",
      primaryAction: {
        title: "Download the Latest Direct Version",
        onAction: () => {
          open(HORA_DIRECT_DOWNLOAD);
        },
      },
      secondaryAction: {
        title: "Copy Homebrew Install Command",
        onAction: () => Clipboard.copy(HOMEBREW_INSTALL_COMMAND),
      },
    });
    return;
  }

  if (error instanceof HoraNotAuthorizedError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Raycast cannot control hora",
      message: "Allow it under System Settings › Privacy & Security › Automation.",
      primaryAction: {
        title: "Open Automation Settings",
        onAction: () => {
          open("x-apple.systempreferences:com.apple.preference.security?Privacy_Automation");
        },
      },
    });
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
