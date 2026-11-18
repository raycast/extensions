import { getPreferenceValues } from "@raycast/api";

export function getPreferences(): Preferences {
  const stored =
    getPreferenceValues<Partial<Record<keyof Preferences, unknown>>>();
  const apiKey = typeof stored.apiKey === "string" ? stored.apiKey : undefined;
  return {
    authMode: stored.authMode === "api-key" ? "api-key" : "oauth-mcp",
    ...(apiKey === undefined ? {} : { apiKey }),
    defaultPlatform: stored.defaultPlatform === "web" ? "web" : "ios",
    defaultSearchMode:
      stored.defaultSearchMode === "standard" ? "standard" : "deep",
    defaultImageQuality:
      stored.defaultImageQuality === "high" ? "high" : "optimized",
    defaultMcpImageFormat:
      stored.defaultMcpImageFormat === "jpg" ? "jpg" : "webp",
    defaultLimit: ["10", "20", "50", "100"].includes(
      String(stored.defaultLimit),
    )
      ? (String(stored.defaultLimit) as Preferences["defaultLimit"])
      : "20",
  };
}

export function hasApiKey(preferences = getPreferences()): boolean {
  return Boolean(preferences.apiKey?.trim());
}
