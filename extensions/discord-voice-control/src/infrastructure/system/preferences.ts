import { getPreferenceValues } from "@raycast/api";
import type { VoiceAction } from "../../domain/types";

/**
 * Typed access to extension preferences (the only persistence in the MVP, per product-rules.md).
 * Keep this the single place that touches `getPreferenceValues` so the rest of the code depends on
 * a small, stable shape rather than Raycast's preference plumbing.
 */
export interface ExtensionPreferences {
  /** Combo string for the mute keybind, e.g. "cmd+shift+m". */
  readonly muteShortcut: string;
  /** Combo string for the deafen keybind, e.g. "cmd+shift+d". */
  readonly deafenShortcut: string;
  /** Whether sanitized local diagnostic logging is enabled. */
  readonly diagnosticLogging: boolean;
}

const DEFAULTS: ExtensionPreferences = {
  muteShortcut: "cmd+shift+m",
  deafenShortcut: "cmd+shift+d",
  diagnosticLogging: false,
};

export function getPreferences(): ExtensionPreferences {
  const raw = getPreferenceValues<Partial<ExtensionPreferences>>();
  return {
    muteShortcut: (raw.muteShortcut ?? DEFAULTS.muteShortcut).trim(),
    deafenShortcut: (raw.deafenShortcut ?? DEFAULTS.deafenShortcut).trim(),
    diagnosticLogging: raw.diagnosticLogging ?? DEFAULTS.diagnosticLogging,
  };
}

/** The configured combo string for a given action. */
export function shortcutForAction(prefs: ExtensionPreferences, action: VoiceAction): string {
  return action === "toggleMute" ? prefs.muteShortcut : prefs.deafenShortcut;
}
