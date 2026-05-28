import { getPreferenceValues } from "@raycast/api";

const DEFAULT_INSTANCE = "https://gitlab.com";

// OAuth scopes requested during the PKCE flow. Not user-configurable: the
// OAuth application's scope checkboxes are the real security gate, and a
// textfield for scopes mostly produces typos and cryptic `invalid_scope`
// errors. The application must be registered with at least these scopes.
export const OAUTH_SCOPES = ["api", "read_user", "read_repository"] as const;

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getInstance(prefs: Preferences = getPrefs()): string {
  return (prefs.instance.trim() || DEFAULT_INSTANCE).replace(/\/+$/, "");
}

export function isOAuthEnabled(prefs: Preferences = getPrefs()): boolean {
  return prefs.authType === "oauth";
}

export function requireOAuthClientId(prefs: Preferences = getPrefs()): string {
  const id = prefs.oauthClientId?.trim();
  if (!id) {
    throw new Error(
      "GitLab OAuth Application ID is not configured. Open the GitLab extension preferences and either set the Application ID or switch Authentication back to Personal Access Token.",
    );
  }
  return id;
}

export function requirePersonalAccessToken(prefs: Preferences = getPrefs()): string {
  const token = prefs.token?.trim();
  if (!token) {
    throw new Error(
      "GitLab API Token is not configured. Open the GitLab extension preferences and either set the API Token or switch Authentication to OAuth.",
    );
  }
  return token;
}
