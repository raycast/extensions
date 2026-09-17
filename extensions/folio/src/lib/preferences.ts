import { getPreferenceValues } from "@raycast/api";

export interface FolioPreferences {
  authWorkerUrl: string;
  oauthClientId: string;
  useFixtures: boolean;
  enableDevPersonalKey: boolean;
  devClientId?: string;
  devConsumerKey?: string;
}

export function prefs(): FolioPreferences {
  const p = getPreferenceValues<FolioPreferences>();
  return {
    authWorkerUrl: (p.authWorkerUrl ?? "").trim().replace(/\/+$/, ""),
    oauthClientId: (p.oauthClientId ?? "").trim(),
    useFixtures: Boolean(p.useFixtures),
    enableDevPersonalKey: Boolean(p.enableDevPersonalKey),
    devClientId: p.devClientId?.trim() || undefined,
    devConsumerKey: p.devConsumerKey?.trim() || undefined,
  };
}

export type AuthMode = "fixtures" | "dev-personal-key" | "oauth";

export function authMode(): AuthMode {
  const p = prefs();
  if (p.useFixtures) return "fixtures";
  if (p.enableDevPersonalKey && p.devClientId && p.devConsumerKey) return "dev-personal-key";
  return "oauth";
}
