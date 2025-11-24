import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { macToggleTheme } from "./mac";
import { winToggleTheme } from "./windows";

const isWin = process.platform === "win32";

export async function toggleTheme() {
  const { announce } = getPreferenceValues<Preferences.Toggle>();

  if (announce) {
    await showHUD("Toggling Theme...");
  } else {
    await closeMainWindow();
  }

  if (isWin) {
    await winToggleTheme();
  } else {
    await macToggleTheme();
  }

  if (announce) {
    await showHUD("Theme Toggled!");
  }
}
