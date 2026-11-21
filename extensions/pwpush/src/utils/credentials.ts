import { buildBaseUrl } from "./pwpush";

export function resolveCurrentServerUrl(serverUrl: string | undefined): string | null {
  try {
    return buildBaseUrl(serverUrl);
  } catch {
    return null;
  }
}

export function resolveApiKeyForRecord(
  recordServerUrl: string,
  preferences: { serverUrl?: string; apiKey?: string },
): string | undefined {
  const currentServerUrl = resolveCurrentServerUrl(preferences.serverUrl);
  if (!currentServerUrl || recordServerUrl !== currentServerUrl) {
    return undefined;
  }

  return preferences.apiKey;
}

export function serverUrlsMatch(recordServerUrl: string, preferences: { serverUrl?: string }): boolean {
  const currentServerUrl = resolveCurrentServerUrl(preferences.serverUrl);
  return currentServerUrl !== null && recordServerUrl === currentServerUrl;
}
