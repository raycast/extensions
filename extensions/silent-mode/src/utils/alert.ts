import { getPreferenceValues, launchCommand, LaunchType, openExtensionPreferences, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const SILENT_VOLUME = 0;
const DEFAULT_ALERT_VOLUME = 100;
const MIN_VOLUME = 1;
const MAX_VOLUME = 100;

export async function setAlertVolume(volume: number): Promise<void> {
  const script = `set volume alert volume ${volume}`;
  await runAppleScript(script);
}

export async function getAlertVolume(): Promise<number> {
  const script = `alert volume of (get volume settings)`;
  const result = await runAppleScript(script);
  return Number(result);
}

export async function checkIfSilentMode(): Promise<boolean> {
  const volume = await getAlertVolume();
  return volume === SILENT_VOLUME;
}

export function getAlertVolumePreference(): number {
  const { "alert-volume": alertVolumePreference } = getPreferenceValues<Preferences>();
  const alertVolume = Number(alertVolumePreference || DEFAULT_ALERT_VOLUME);

  if (Number.isNaN(alertVolume) || alertVolume < MIN_VOLUME || alertVolume > MAX_VOLUME) {
    throw new Error("Invalid alert volume preference");
  }

  return alertVolume;
}

export async function toggleSilentMode(action?: "on" | "off"): Promise<void> {
  try {
    const currentAction = action || ((await checkIfSilentMode()) ? "off" : "on");
    const targetVolume = currentAction === "on" ? SILENT_VOLUME : getAlertVolumePreference();
    await setAlertVolume(targetVolume);

    // Silently fail menu bar refresh - it's not critical for the main operation
    launchCommand({ name: "silent-mode-menu-bar", type: LaunchType.Background }).catch(() => {});

    showHUD(`Silent mode ${currentAction}`);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid alert volume preference") {
      showFailureToast(error, {
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });
      return;
    }

    await showFailureToast(error);
  }
}
