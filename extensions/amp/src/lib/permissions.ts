import { Toast, open, showToast } from "@raycast/api";

const SCREEN_RECORDING_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

export async function openScreenRecordingSettings(): Promise<void> {
  await open(SCREEN_RECORDING_SETTINGS_URL);
}

export async function showCaptureError(error: unknown): Promise<void> {
  const message = String(error);
  const needsPermission = message.includes("Screen & System Audio Recording");
  await showToast({
    style: Toast.Style.Failure,
    title: needsPermission
      ? "Enable Screen Recording for Raycast"
      : "Could not capture window",
    message: needsPermission
      ? "Open System Settings → Privacy & Security → Screen & System Audio Recording, enable Raycast, then quit and reopen Raycast."
      : message,
    primaryAction: needsPermission
      ? {
          title: "Open System Settings",
          onAction: () => void openScreenRecordingSettings(),
        }
      : undefined,
  });
}
