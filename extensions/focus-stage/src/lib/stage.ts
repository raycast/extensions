import { closeMainWindow, environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { prepareToggle, toggleStage } from "swift:../../swift";

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

export type ToggleOutcome = { active: boolean; app?: string; error?: string };

/**
 * Starts a session on the window you are looking at, or ends the running one.
 * `closeRaycast`: step Raycast's own window aside first (the Toggle command).
 */
export async function runToggle({ closeRaycast }: { closeRaycast: boolean }): Promise<ToggleOutcome> {
  const settings = JSON.stringify(settingsFromPreferences());
  const context = await prepareToggle(stateDirectory);

  if (context.active) {
    if (closeRaycast) await closeMainWindow();
    await toggleStage(stateDirectory, settings, "");
    return { active: false };
  }
  // The window to focus is captured before Raycast steps aside. Raycast's window is closed first,
  // except when the stage is for a Raycast window that had focus itself (the AI Chat): closing would
  // hand focus to the previous app. From the search bar, the captured window is the one behind it
  // (which can be the AI Chat), and the bar is closed.
  const target = (context.target ?? undefined) as TargetHint | undefined;
  if (closeRaycast && (!isRaycastWindow(target) || target?.viaLauncher)) await closeMainWindow();

  const status = await toggleStage(stateDirectory, settings, target ? JSON.stringify(target) : "");
  // busy: a start or end was still running (fast double press), so this press was ignored.
  const failed = !status.active && !status.busy;
  return {
    active: status.active,
    app: status.app ?? undefined,
    error: failed ? (status.message ?? "Unknown error") : undefined,
  };
}

/** Menu bar commands only refresh on their interval; nudge it after a change. */
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "focus-stage-menu-bar", type: LaunchType.Background });
  } catch {
    // The menu bar command isn't enabled.
  }
}
