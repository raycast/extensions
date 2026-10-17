import type { RegionField } from "./connect";
import type { Connections } from "./connections";
import type { Settings, ValueSource } from "./types";

// Empty and whitespace-only preferences mean "not set", so providers can check for undefined alone.
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// The region an API key form starts on. It is the region the provider already has, so a key saved as China doesn't
// reopen on Global. Without a region field, or without a saved region, it is global.
export function startRegion(settings: Settings, field: RegionField | undefined): "global" | "china" {
  return (field && settings[field]) || "global";
}

// Where a key or cookie comes from. The preference wins when it is set, otherwise the saved connection is used. The
// value is undefined when neither has one, and the source is undefined with it.
function resolveSecret(
  fromPreferences: string | undefined,
  fromConnection: string | undefined,
): { value?: string; source?: ValueSource } {
  const preference = clean(fromPreferences);
  if (preference !== undefined) {
    return { value: preference, source: "preference" };
  }
  const connection = clean(fromConnection);
  return connection === undefined ? {} : { value: connection, source: "connection" };
}

// Builds the provider settings from the Raycast preferences and the connections the extension stored itself. A value
// typed into the preferences wins over a stored one, because the user typed it on purpose. The GitHub token from signing
// in is kept apart from both, because it lives in OAuth storage.
// Each credential also records its source, so a hint can name the preference or the action that set it.
// A region belongs to its key. When the key came from the preferences, the preferences' region is used. When it came
// from a connection, the region stored with that connection is used, defaulting to "global".
export function toSettings(prefs: Preferences, connections: Connections = {}, githubOAuthToken?: string): Settings {
  const claudeSession = resolveSecret(prefs.claudeSessionKey, connections.claudeSessionKey);
  const cursor = resolveSecret(prefs.cursorCookie, connections.cursorCookie);
  const openrouter = resolveSecret(prefs.openrouterApiKey, connections.openrouterApiKey);
  const zai = resolveSecret(prefs.zaiApiKey, connections.zaiApiKey);
  const kimi = resolveSecret(prefs.kimiApiKey, connections.kimiApiKey);
  const deepseek = resolveSecret(prefs.deepseekApiKey, connections.deepseekApiKey);
  const moonshot = resolveSecret(prefs.moonshotApiKey, connections.moonshotApiKey);

  return {
    // Only a connection can turn these on, since Raycast preferences have no such settings.
    claudeKeychain: connections.claudeKeychain,
    claudeConfigDir: connections.claudeConfigDir,
    codexHome: connections.codexHome,
    claudeSessionKey: claudeSession.value,
    claudeSessionKeySource: claudeSession.source,
    cursorCookie: cursor.value,
    cursorCookieSource: cursor.source,
    githubToken: clean(prefs.githubToken),
    githubOAuthToken: clean(githubOAuthToken),
    openrouterApiKey: openrouter.value,
    openrouterApiKeySource: openrouter.source,
    zaiApiKey: zai.value,
    zaiApiKeySource: zai.source,
    zaiRegion: zai.source === "connection" ? (connections.zaiRegion ?? "global") : prefs.zaiRegion,
    kimiApiKey: kimi.value,
    kimiApiKeySource: kimi.source,
    deepseekApiKey: deepseek.value,
    deepseekApiKeySource: deepseek.source,
    moonshotApiKey: moonshot.value,
    moonshotApiKeySource: moonshot.source,
    moonshotRegion: moonshot.source === "connection" ? (connections.moonshotRegion ?? "global") : prefs.moonshotRegion,
  };
}
