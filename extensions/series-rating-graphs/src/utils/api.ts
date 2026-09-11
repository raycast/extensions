import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_BASE_URL = "https://api.tiffara.com";

/** Resolved IMDxAPI base URL from preferences (trailing slash stripped). */
export function getApiBaseUrl(): string {
  const { apiBaseUrl } = getPreferenceValues<Preferences>();
  const trimmed = apiBaseUrl?.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_API_BASE_URL;
}
