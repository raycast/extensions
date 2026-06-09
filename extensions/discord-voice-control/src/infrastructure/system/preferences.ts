import { getPreferenceValues } from "@raycast/api";
import type { VoiceAction } from "../../domain/types";

export interface ResolvedPreferences {
  readonly muteShortcut: string;
  readonly deafenShortcut: string;
  readonly diagnosticLogging: boolean;
}

const DEFAULTS: ResolvedPreferences = {
  muteShortcut: "cmd+shift+m",
  deafenShortcut: "cmd+shift+d",
  diagnosticLogging: false,
};

export function getPreferences(): ResolvedPreferences {
  const raw = getPreferenceValues<Preferences>();
  return {
    muteShortcut: (raw.muteShortcut ?? DEFAULTS.muteShortcut).trim(),
    deafenShortcut: (raw.deafenShortcut ?? DEFAULTS.deafenShortcut).trim(),
    diagnosticLogging: raw.diagnosticLogging ?? DEFAULTS.diagnosticLogging,
  };
}

/** The configured combo string for a given action. */
export function shortcutForAction(prefs: ResolvedPreferences, action: VoiceAction): string {
  return action === "toggleMute" ? prefs.muteShortcut : prefs.deafenShortcut;
}
