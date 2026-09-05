import { getPreferenceValues } from "@raycast/api";
import { KillSignal, isKillSignal } from "../core/signals";

export interface Settings {
  confirmKill: boolean;
  showDetailByDefault: boolean;
  defaultSignal: KillSignal;
}

/**
 * Values come from the manifest-generated `Preferences` type, so a renamed preference is a
 * compile error rather than a silent `undefined`. They are still validated at runtime: the
 * stored value predates any manifest change and the signal must be one we know how to send.
 */
export function getSettings(): Settings {
  const raw = getPreferenceValues<Preferences>();

  return {
    confirmKill: raw.confirmKill !== false,
    showDetailByDefault: raw.showDetailByDefault !== false,
    defaultSignal: isKillSignal(raw.defaultSignal) ? raw.defaultSignal : "SIGTERM",
  };
}
