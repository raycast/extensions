import { showHUD } from "@raycast/api";
import { changeSleepState, readSleepState } from "./lib/power";
import { refreshMenuBar, reportError } from "./lib/ui";

export default async function ToggleSleep() {
  try {
    const before = await readSleepState();
    await changeSleepState(!before.disabled);
    await refreshMenuBar();
    await showHUD(before.disabled ? "Sleep allowed" : "Keeping your Mac awake");
  } catch (error) {
    await reportError(error);
  }
}
