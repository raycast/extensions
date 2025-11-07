import { getPreferenceValues, launchCommand, LaunchType, openExtensionPreferences, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export function setAlertVolume(volume: number) {
  const script = `set volume alert volume ${volume}`;
  return runAppleScript(script);
}

export function getAlertVolume() {
  const script = `alert volume of (get volume settings)`;
  return runAppleScript(script).then(Number);
}

export function checkIfSilentMode() {
  return getAlertVolume().then((volume) => volume === 0);
}

export function getAlertVolumePreference() {
  const alertVolume = Number(getPreferenceValues()["alert-volume"]);
  if (Number.isNaN(alertVolume) || alertVolume < 1 || alertVolume > 100) {
    throw new Error("Invalid alert volume preference");
  }

  return alertVolume;
}

export async function toggleSilentMode(action?: "on" | "off") {
  try {
    const currentAction = action || ((await checkIfSilentMode()) ? "off" : "on");
    const targetVolume = currentAction === "on" ? 0 : getAlertVolumePreference();
    await setAlertVolume(targetVolume);
    launchCommand({ name: "silent-mode-menu-bar", type: LaunchType.Background }).catch(() => {});
    showHUD(`Silent mode ${currentAction}`);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid alert volume preference") {
      showFailureToast(error, {
        primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
      });

      return;
    }

    showFailureToast(error);
  }
}
