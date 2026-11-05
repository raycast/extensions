import {
  Clipboard,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import {
  DaemonNotRunningError,
  INSTALL_DAEMON_COMMAND,
  getFanSnapshot,
  isAnyFanManual,
  setFanProfile,
} from "./lib/smctl";

/**
 * Toggles between macOS control and the chosen manual profile:
 * any fan in manual mode → auto; all fans in auto → profile (default "full").
 */
export default async function Command(): Promise<void> {
  const { toggleProfile } = getPreferenceValues<Preferences.ToggleFans>();
  const profile = toggleProfile === "quiet" ? "quiet" : "full";
  try {
    const snapshot = await getFanSnapshot();
    if (isAnyFanManual(snapshot.fans)) {
      await setFanProfile("auto");
      await showHUD("Fans returned to macOS control");
    } else {
      await setFanProfile(profile);
      await showHUD(
        profile === "full" ? "Fans at full speed" : "Quiet profile applied",
      );
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle fans",
      message: error instanceof Error ? error.message : String(error),
      primaryAction:
        error instanceof DaemonNotRunningError
          ? {
              title: "Copy Install Command",
              onAction: () => Clipboard.copy(INSTALL_DAEMON_COMMAND),
            }
          : undefined,
    });
  }
}
