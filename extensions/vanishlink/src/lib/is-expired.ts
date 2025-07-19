import { getPreferenceValues } from "@raycast/api";

const ONE_DAY_MS = 1_000 * 60 * 60 * 24;
const EXPIRY_DAYS = 7;

function getExpiryDays(preferences: Preferences): number {
  switch (preferences.expiredTime) {
    case "1day":
      return 1;
    case "1week":
      return 7;
    case "2week":
      return 14;
    case "1month":
      return 30;
    case "3month":
      return 90;
    case "6month":
      return 180;
    case "1year":
      return 365;
    default:
      return EXPIRY_DAYS; // Default to 7 days if no valid preference is set
  }
}

export function isExpired(lastAccessedAt: number, now: number): boolean {
  const preferences = getPreferenceValues<Preferences>();
  const expiredTime = getExpiryDays(preferences);

  const daysSinceAccess = (now - lastAccessedAt) / ONE_DAY_MS;
  return daysSinceAccess > expiredTime;
}
