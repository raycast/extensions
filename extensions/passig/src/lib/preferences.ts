import { getPreferenceValues } from "@raycast/api";

/** URL del server API: fisso, non modificabile dall'utente. */
export const SERVER_URL = "https://passig.igsolutions.it";

export interface PassigPreferences {
  email: string;
  autoLockMinutes?: string;
  deviceName?: string;
}

export function getPrefs(): Required<PassigPreferences> & { serverUrl: string } {
  const p = getPreferenceValues<PassigPreferences>();
  return {
    serverUrl: SERVER_URL,
    email: p.email,
    autoLockMinutes: p.autoLockMinutes && Number(p.autoLockMinutes) > 0 ? p.autoLockMinutes : "15",
    deviceName: p.deviceName?.trim() || "Raycast",
  };
}

export function autoLockMs(): number {
  return Number(getPrefs().autoLockMinutes) * 60_000;
}
