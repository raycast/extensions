import { getPreferenceValues } from "@raycast/api";
import { TIME_CONSTANTS, EXPIRY_DAYS_MAP } from "./constants";

export function getExpiryDays(preferences: Preferences): number {
  return EXPIRY_DAYS_MAP[preferences.expiredTime] ?? TIME_CONSTANTS.DEFAULT_EXPIRY_DAYS;
}

export function isExpired(lastAccessedAt: number, now: number): boolean {
  const preferences = getPreferenceValues<Preferences>();
  const expiredTime = getExpiryDays(preferences);

  const daysSinceAccess = (now - lastAccessedAt) / TIME_CONSTANTS.ONE_DAY_MS;
  return daysSinceAccess > expiredTime;
}
