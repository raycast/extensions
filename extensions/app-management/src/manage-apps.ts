// Hotkey target (SPEC.md §3.1): every press mounts app-list fresh, so both helpers run once per press and a list left
// open never shows stale data. Same launcher pattern as both source projects (badge U5 fix, window "one scan per open").
import { launchCommand, LaunchType, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    await launchCommand({ name: "app-list", type: LaunchType.UserInitiated });
  } catch (error) {
    await showHUD(`Could not open the app list: ${String(error)}`);
  }
}
