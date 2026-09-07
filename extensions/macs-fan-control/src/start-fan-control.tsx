import { showHUD, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { isRunning, launchApp, quitApp } from "./lib/mfc";
import { ensureInstalled, Prefs } from "./lib/actions";

export default async function Command() {
  if (!(await ensureInstalled())) return;
  await closeMainWindow();

  const { toggleBehavior } = getPreferenceValues<Prefs>();
  const running = await isRunning();

  if (!running) {
    await launchApp();
    await showHUD("🌀  Macs Fan Control started");
    return;
  }

  if (toggleBehavior === "toggle") {
    // Quitting hands every fan back to the system's own control.
    await quitApp();
    await showHUD("⏹  Macs Fan Control stopped — fans back on auto");
    return;
  }

  await showHUD("🌀  Macs Fan Control is already running");
}
