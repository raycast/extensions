import { LocalStorage, OAuth, Toast, popToRoot, showToast } from "@raycast/api";
import { OAuthService, WithAccessTokenComponentOrFn, withAccessToken } from "@raycast/utils";
import { PINS_STORAGE_KEY, USAGE_STORAGE_KEY } from "./directory";
import { GOOGLE_CLIENT_ID } from "./googleAuth";

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
  scope: "https://www.googleapis.com/auth/directory.readonly",
  bodyEncoding: "url-encoded",
});

export function withDirectoryAuth(componentOrFn: WithAccessTokenComponentOrFn) {
  return withAccessToken(directoryGoogle)(componentOrFn);
}

/** Removes tokens, pins and recents. The caller is responsible for wiping the cached directory (see the UI). */
export async function signOutOfDirectory(): Promise<void> {
  await directoryGoogle.client.removeTokens();
  await LocalStorage.removeItem(USAGE_STORAGE_KEY);
  await LocalStorage.removeItem(PINS_STORAGE_KEY);
  await showToast({
    style: Toast.Style.Success,
    title: "Signed out of Google Directory",
    message: "Reopen the command to sign in again",
  });
  await popToRoot();
}
