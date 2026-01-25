import { LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { SavedApp } from "./types";
import { closeApps } from "./utils";

export default async function Command() {
  try {
    const stored = await LocalStorage.getItem<string>("group-apps");
    if (!stored) {
      await showHUD("No apps in the group to close");
      return;
    }

    const savedApps: SavedApp[] = JSON.parse(stored);
    if (savedApps.length === 0) {
      await showHUD("No apps in the group to close");
      return;
    }

    // Since this is a no-view command, showHUD is better, but we can also use showToast.
    // However, for no-view commands, Raycast usually recommends showing HUD or just doing the action.
    // We'll show a HUD to confirm action started if it takes time, but closeApps is fast (async).
    // Let's show a loading HUD if we can, or just wait for result.

    // Actually, showToast might not persist well if the command exits immediately.
    // But since we await closeApps, the process is alive.

    await showToast({ title: "Closing apps...", style: Toast.Style.Animated });

    const { failedApps } = await closeApps(savedApps);

    if (failedApps.length > 0) {
      await showHUD(`Skipped ${failedApps.length} apps: ${failedApps.join(", ")}`);
    } else {
      await showHUD("Quit commands sent");
    }
  } catch (error) {
    console.error("Failed to close apps", error);
    await showHUD("Failed to close apps");
  }
}
