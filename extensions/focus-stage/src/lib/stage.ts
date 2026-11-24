import { environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";

/** Mirrors `StageSettings` in the Swift core; every key is required by its decoder. */
export type StageSettings = {
  fraction: number;
  grain: number;
  glow: boolean;
  coverSameAppWindows: boolean;
  showLabel: boolean;
  hideDock: boolean;
  holdNotifications: boolean;
};

/** Mirrors `TargetHint` in the Swift core. */
export type TargetHint = {
  pid: number;
  windowID?: number;
  bundleID?: string;
  /** The search bar (or another panel) had focus; `windowID` is the window behind it. */
  viaLauncher?: boolean;
};

export function settingsFromPreferences(): StageSettings {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return {
    fraction: Number(preferences.windowSize),
    grain: Number(preferences.grain),
    glow: preferences.glow,
    coverSameAppWindows: preferences.coverSameAppWindows,
    showLabel: preferences.showLabel,
    hideDock: preferences.hideDock,
    holdNotifications: preferences.holdNotifications,
  };
}

export const stateDirectory = environment.supportPath;

/** A normal Raycast window, such as the AI Chat, had focus when the command ran. */
export function isRaycastWindow(target: TargetHint | undefined) {
  return target?.windowID != null && (target.bundleID ?? "").startsWith("com.raycast");
}

/** Menu bar commands only refresh on their interval; nudge it after a change. */
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "focus-stage-menu-bar", type: LaunchType.Background });
  } catch {
    // The menu bar command isn't enabled.
  }
}
