import { getPreferenceValues } from "@raycast/api";
import { KillSignal, isKillSignal } from "../core/signals";

export interface Settings {
  confirmKill: boolean;
  showDetailByDefault: boolean;
  defaultSignal: KillSignal;
}

/**
 * Preference values are read back as plain JSON, so they are validated here rather than
 * trusted. In particular the signal must be one this extension knows how to send.
 */
export function getSettings(): Settings {
  const raw = getPreferenceValues<Partial<Record<keyof Settings, unknown>>>();

  return {
    confirmKill: raw.confirmKill !== false,
    showDetailByDefault: raw.showDetailByDefault !== false,
    defaultSignal: isKillSignal(raw.defaultSignal) ? raw.defaultSignal : "SIGTERM",
  };
}
