import { getPreferenceValues } from "@raycast/api";

/** Normalized view of the manifest preferences. The shape comes from Raycast's generated `Preferences` type. */
export function prefs() {
  const p = getPreferenceValues<Preferences>();
  return {
    authWorkerUrl: (p.authWorkerUrl ?? "").trim().replace(/\/+$/, ""),
    oauthClientId: (p.oauthClientId ?? "").trim(),
    useFixtures: Boolean(p.useFixtures),
  };
}

export type FolioPreferences = ReturnType<typeof prefs>;

export type AuthMode = "fixtures" | "oauth";

export function authMode(): AuthMode {
  return prefs().useFixtures ? "fixtures" : "oauth";
}
