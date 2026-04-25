import { getPreferenceValues } from "@raycast/api";

export const APP_ID = "spoo-raycast";
export const DEFAULT_API_BASE_URL = "https://spoo.me";

export const CACHE_KEYS = {
  links: "cache:links",
  stats: "cache:stats",
  dashboard: "cache:dashboard",
  lastSync: "cache:last-sync",
} as const;

export const CACHE_TTL = {
  links: 5 * 60 * 1000,
  stats: 2 * 60 * 1000,
  aliasCheck: 30 * 1000,
} as const;

export const DEBOUNCE_MS = {
  aliasCheck: 350,
  search: 250,
} as const;

export function getPreferences() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return {
    apiBaseUrl: (prefs.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, ""),
    autoCopy: prefs.autoCopy,
    celebrate: prefs.celebrate,
  };
}

export function getApiBaseUrl(): string {
  return getPreferences().apiBaseUrl;
}
