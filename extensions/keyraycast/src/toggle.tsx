import { showHUD, getPreferenceValues } from "@raycast/api";
import { startOverlay, stopOverlay, isRunning } from "./helper";

function buildConfig(prefs: Preferences) {
  return {
    displayMode: prefs.displayMode,
    position: prefs.position,
    displayDuration: parseFloat(prefs.displayDuration),
    fontSize: prefs.fontSize,
    uppercaseKeys: prefs.uppercaseKeys,
    showSpaceSymbol: prefs.showSpaceSymbol,
    showMouseClicks: prefs.showMouseClicks,
    appearance: prefs.appearance,
  };
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const config = buildConfig(prefs);

  try {
    if (isRunning()) {
      await stopOverlay();
      await showHUD("🔴 Keystroke overlay off");
    } else {
      const result = await startOverlay(config);

      if (result.success) {
        await showHUD("🟢 Keystroke overlay on");
      } else {
        await showHUD(`⚠️ ${result.error}`);
      }
    }
  } catch (error) {
    await showHUD(`⚠️ ${error}`);
  }
}
