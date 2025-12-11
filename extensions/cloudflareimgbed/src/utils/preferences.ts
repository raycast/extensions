import { getPreferenceValues } from "@raycast/api";
import type { ImgBedPreferences } from "../types/preferences";

export function getPreferences(): ImgBedPreferences {
  const prefs = getPreferenceValues<ImgBedPreferences>();
  return {
    ...prefs,
    apiBaseUrl: normalizeBaseUrl(prefs.apiBaseUrl),
  };
}

export function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function withPreferenceFallback<T extends object>(overrides: Partial<T> | undefined, fallback: T): T {
  return {
    ...fallback,
    ...(overrides ?? {}),
  };
}
