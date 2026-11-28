import { environment, LaunchType, showHUD } from "@raycast/api";
import { prefs, startScan } from "./lib";

export default async function Command() {
  const manual = environment.launchType === LaunchType.UserInitiated;
  // the 30-min interval run is skipped when the preference is off; a manual run always scans
  if (!manual && prefs().backgroundScan === false) return;
  const started = startScan();
  if (manual) await showHUD(started ? "LAN scan started in background" : "LAN scan already running");
}
