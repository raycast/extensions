import { getPreferenceValues } from "@raycast/api";
import type { LanguagePreference } from "../i18n";

/** URL del server API: fisso, non modificabile dall'utente. */
export const SERVER_URL = "https://api.passig.app";

/** Preferenze normalizzate (il tipo `Preferences` è generato da Raycast in raycast-env.d.ts). */
export interface ResolvedPreferences {
  serverUrl: string;
  email: string;
  autoLockMinutes: string;
  deviceName: string;
  /** `system` (default) oppure una delle 7 lingue supportate; vedi `src/i18n`. */
  language: LanguagePreference;
}

export function getPrefs(): ResolvedPreferences {
  const p = getPreferenceValues<Preferences>();
  return {
    serverUrl: SERVER_URL,
    email: p.email,
    autoLockMinutes: p.autoLockMinutes && Number(p.autoLockMinutes) > 0 ? p.autoLockMinutes : "15",
    deviceName: p.deviceName?.trim() || "Raycast",
    language: p.language || "system",
  };
}

export function autoLockMs(): number {
  return Number(getPrefs().autoLockMinutes) * 60_000;
}
