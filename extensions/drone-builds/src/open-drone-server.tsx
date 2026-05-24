import {
  closeMainWindow,
  getPreferenceValues,
  open,
  showHUD,
} from "@raycast/api";

export default async function Command(): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const url = (prefs.droneUrl || "").trim().replace(/\/+$/, "");
  if (!url) {
    await closeMainWindow();
    await showHUD("Set Drone URL in extension preferences");
    return;
  }
  await open(url);
  await closeMainWindow();
}
