import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  domain?: string;
}

/**
 * The host links are opened against. Defaults to production (`wavedash.com`)
 * and can be pointed at a staging host via the extension's `domain` preference.
 * Any scheme or trailing slashes the user types are stripped.
 */
export function getDomain(): string {
  const { domain } = getPreferenceValues<Preferences>();
  const cleaned = (domain ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return cleaned || "wavedash.com";
}

export function getBaseUrl(): string {
  return `https://${getDomain()}`;
}

/** Build the search results URL for a query. */
export function searchUrl(query: string): string {
  return `${getBaseUrl()}/search/${encodeURIComponent(query)}`;
}
