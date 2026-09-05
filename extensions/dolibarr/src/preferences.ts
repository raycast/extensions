import { getPreferenceValues } from "@raycast/api";
import { systemLocale } from "./format";
import { normalizeBaseUrl, stripApiPath } from "./url";

/** Mirrors the default declared in package.json. */
const DEFAULT_LOCALE = "de-DE";

export type DolibarrConfig = { baseUrl: string; apiKey: string };

export function getConfig(): DolibarrConfig {
  const prefs = getPreferenceValues<Preferences>();
  return { baseUrl: normalizeBaseUrl(prefs.dolibarrUrl), apiKey: prefs.apiKey };
}

export function getWebBaseUrl(): string {
  return stripApiPath(getConfig().baseUrl);
}

/**
 * Locale for numbers and dates, chosen explicitly rather than inferred. macOS keeps language and
 * region apart while Node only sees the language, so the process locale reports en-US even on a
 * machine configured for German formats.
 */
export function getDisplayLocale(): string {
  const preference = getPreferenceValues<Preferences>().displayLocale;
  if (!preference) return DEFAULT_LOCALE;
  return preference === "system" ? systemLocale() : preference;
}
