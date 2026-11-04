/**
 * Google sign-in for the extension. Each user brings their own OAuth client ID (type iOS, bundle ID
 * com.raycast) so PKCE works without a client secret, as in the google-contacts extension.
 */

import { environment, getPreferenceValues, LaunchType } from "@raycast/api";
import { OAuthService, withAccessToken } from "@raycast/utils";

import { createHttpClient } from "./http";

/** Every OAuth scope the extension requests. Changing this list makes users sign in again. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.spaces.create",
  "https://www.googleapis.com/auth/chat.messages.readonly",
  "https://www.googleapis.com/auth/chat.messages.create",
  "https://www.googleapis.com/auth/chat.memberships.readonly",
  "https://www.googleapis.com/auth/chat.users.readstate",
  "https://www.googleapis.com/auth/chat.messages.reactions",
  "https://www.googleapis.com/auth/directory.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
] as const;

const { clientId } = getPreferenceValues<Preferences>();

export const google = OAuthService.google({
  clientId: clientId.trim(),
  scope: GOOGLE_SCOPES.join(" "),
});

/** Wraps a command, component or AI tool so it runs signed in. */
export const withGoogleAuth = withAccessToken(google);

/**
 * Drops stored tokens after a missing-scope error so the retry signs in with the current scopes.
 * Only when the user launched the command; in the background a sign-in screen can't be shown.
 */
async function dropTokensForScopeChange(): Promise<boolean> {
  if (environment.launchType === LaunchType.Background) return false;
  if (!(await google.client.getTokens())) return false;
  await google.client.removeTokens();
  return true;
}

let pendingToken: Promise<string> | undefined;

/** `google.authorize()` returns the stored token and refreshes it when expired; parallel calls share one refresh. */
function getToken(): Promise<string> {
  pendingToken ??= google.authorize().finally(() => {
    pendingToken = undefined;
  });
  return pendingToken;
}

/** Shared HTTP client for the Chat and People APIs. */
export const http = createHttpClient({
  getToken,
  onScopeError: dropTokensForScopeChange,
});

/** Signs out so the next command run signs in again. */
export async function signOut(): Promise<void> {
  await google.client.removeTokens();
}
