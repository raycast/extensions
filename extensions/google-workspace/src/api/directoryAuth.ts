import { LocalStorage, OAuth, Toast, popToRoot, showToast } from "@raycast/api";
import { OAuthService, WithAccessTokenComponentOrFn, withAccessToken } from "@raycast/utils";
import { pinsStorageKey, usageStorageKey } from "./directory";
import { GOOGLE_CLIENT_ID, decodeJWT } from "./googleAuth";

// Stable Google account id (ID token `sub`), set on every launch by onAuthorize. Undefined for tokens issued
// before the `openid` scope was requested.
let accountId: string | undefined;

export function getDirectoryAccountId(): string | undefined {
  return accountId;
}

// Separate login from the Drive one: distinct providerId so tokens are stored independently.
export const directoryGoogle = new OAuthService({
  client: new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.AppURI,
    providerName: "Google Directory",
    providerIcon: "google-logo.png",
    providerId: "google-directory",
    description: "Connect your Google account to search your organization's directory",
  }),
  clientId: GOOGLE_CLIENT_ID,
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  refreshTokenUrl: "https://oauth2.googleapis.com/token",
  scope: "openid https://www.googleapis.com/auth/directory.readonly",
  bodyEncoding: "url-encoded",
  onAuthorize({ idToken }) {
    accountId = idToken ? decodeJWT(idToken).sub : undefined;
  },
});

export function withDirectoryAuth(componentOrFn: WithAccessTokenComponentOrFn) {
  return withAccessToken(directoryGoogle)(componentOrFn);
}

/** Removes tokens, pins and recents. The caller is responsible for wiping the cached directory (see the UI). */
export async function signOutOfDirectory(): Promise<void> {
  await directoryGoogle.client.removeTokens();
  if (accountId) {
    await LocalStorage.removeItem(usageStorageKey(accountId));
    await LocalStorage.removeItem(pinsStorageKey(accountId));
  }
  await showToast({
    style: Toast.Style.Success,
    title: "Signed out of Google Directory",
    message: "Reopen the command to sign in again",
  });
  await popToRoot();
}
