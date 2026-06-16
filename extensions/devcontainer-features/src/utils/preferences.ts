import { getPreferenceValues } from "@raycast/api";
import { setCacheTtl } from "../api/cache";

/**
 * Get all preferences
 */
export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Get cache TTL in hours
 */
export function getCacheTtlHours(): number {
  const { cacheTtlHours } = getPreferences();
  return parseInt(cacheTtlHours, 10) || 24;
}

/**
 * Get fetch concurrency
 */
export function getConcurrency(): number {
  const { concurrency } = getPreferences();
  return parseInt(concurrency, 10) || 10;
}

/**
 * Check if GitHub token is configured
 */
export function hasGitHubToken(): boolean {
  const { githubToken } = getPreferences();
  return Boolean(githubToken && githubToken.trim() !== "");
}

/**
 * Initialize preferences (apply cache TTL, etc.)
 */
export function initializePreferences(): void {
  const hours = getCacheTtlHours();
  setCacheTtl(hours);
}
