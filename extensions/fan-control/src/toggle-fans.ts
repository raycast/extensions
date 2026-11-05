import {
  Clipboard,
  LaunchProps,
  LaunchType,
  getPreferenceValues,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  DaemonNotRunningError,
  INSTALL_DAEMON_COMMAND,
  ToggleTarget,
  describeToggle,
  getFanSnapshot,
  setFanProfile,
} from "./lib/smctl";

const UNAVAILABLE = "Fan state unavailable";

/** Re-reads the fans and shows "<current> · <%> → <next>" as the subtitle. */
async function updateSubtitle(profile: ToggleTarget): Promise<void> {
  try {
    const { fans } = await getFanSnapshot();
    await updateCommandMetadata({
      subtitle: describeToggle(fans, profile).subtitle,
    });
  } catch {
    await updateCommandMetadata({ subtitle: UNAVAILABLE });
  }
}

/**
 * Toggles between macOS control and the chosen manual profile:
 * any fan in manual mode → auto; all fans in auto → profile (default "full").
 * Background runs (the interval, or a refresh from another command) only
 * update the subtitle; they never change the fans.
 */
export default async function Command(props: LaunchProps): Promise<void> {
  const { toggleProfile } = getPreferenceValues<Preferences.ToggleFans>();
  const profile: ToggleTarget = toggleProfile === "quiet" ? "quiet" : "full";

  if (props.launchType === LaunchType.Background) {
    await updateSubtitle(profile);
    return;
  }

  try {
    const { fans } = await getFanSnapshot();
    const state = describeToggle(fans, profile);
    await setFanProfile(state.current === "Auto" ? profile : "auto", {
      refreshToggle: false,
    });
    await updateSubtitle(profile);
    await showHUD(`Fans: ${state.current} → ${state.next}`);
  } catch (error) {
    await updateCommandMetadata({ subtitle: UNAVAILABLE });
    await showFailureToast(error, {
      title: "Failed to toggle fans",
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
