import { getPreferenceValues, showHUD } from "@raycast/api";
import { Preferences, readRunningPid, startHelper } from "./lib/screen-cleaner";

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();

  if (readRunningPid() !== null) {
    await showHUD("Cleaning mode is already active — press Esc 5 times to exit");
    return;
  }

  const duration = Number(preferences.duration);

  try {
    startHelper({
      seconds: Number.isFinite(duration) ? duration : 60,
      lockKeyboard: preferences.strictKeyboardLock,
      showHint: preferences.showExitHint,
    });
  } catch (error) {
    await showHUD(
      error instanceof Error ? `Could not start cleaning mode: ${error.message}` : "Could not start cleaning mode",
    );
    return;
  }

  await showHUD("Cleaning mode started — press Esc 5 times to exit");
}
