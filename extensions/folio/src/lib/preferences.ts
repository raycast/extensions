import { getPreferenceValues } from "@raycast/api";

/** Normalized view of the manifest preferences. The shape comes from Raycast's generated `Preferences` type. */
export function prefs() {
  const p = getPreferenceValues<Preferences>();
  return {
    authWorkerUrl: (p.authWorkerUrl ?? "").trim().replace(/\/+$/, ""),
    oauthClientId: (p.oauthClientId ?? "").trim(),
    useFixtures: Boolean(p.useFixtures),
    enableDevPersonalKey: Boolean(p.enableDevPersonalKey),
    devClientId: p.devClientId?.trim() || undefined,
    devConsumerKey: p.devConsumerKey?.trim() || undefined,
  };
}

export type FolioPreferences = ReturnType<typeof prefs>;

export type AuthMode = "fixtures" | "dev-personal-key" | "oauth";

export function authMode(): AuthMode {
  const p = prefs();
  if (p.useFixtures) return "fixtures";
  if (p.enableDevPersonalKey && p.devClientId && p.devConsumerKey) return "dev-personal-key";
  return "oauth";
}
