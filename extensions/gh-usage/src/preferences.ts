import { getPreferenceValues } from "@raycast/api";

export const preferences = getPreferenceValues<Preferences>();

export function getRefreshIntervalMs(): number {
  const val = (preferences as Record<string, string>).refreshInterval;
  return parseInt(val || "60", 10) * 1000;
}

export function getGhCommand(): string {
  const val = (preferences as Record<string, string>).customGhPath;
  return val || "gh";
}
