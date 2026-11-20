import { getPreferenceValues, OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import type { Authentication } from "./tinyfish";

export const tinyfish = new OAuthService({
  client: new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "TinyFish",
    providerIcon: "icon.png",
    providerId: "tinyfish",
    description: "Connect your TinyFish account to search the web and fetch page content.",
  }),
  // Public client registered with TinyFish for this extension's Raycast redirect URI.
  clientId: "nJsuDbUzDBoxDpu2",
  authorizeUrl: "https://clerk.tinyfish.ai/oauth/authorize",
  tokenUrl: "https://clerk.tinyfish.ai/oauth/token",
  scope: "openid profile email offline_access",
  bodyEncoding: "url-encoded",
  personalAccessToken: getPreferenceValues<Preferences>().apiKey?.trim(),
});

let authorization: Promise<string> | undefined;

export async function getAuthentication(): Promise<Authentication> {
  const accessToken = getAccessToken();
  if (accessToken.type === "personal") {
    return { type: "api-key", token: accessToken.token };
  }

  // Refresh before each operation, including in commands left open past token expiry.
  // Share any refresh in progress so a rotating refresh token is only used once.
  authorization ??= tinyfish.authorize().finally(() => {
    authorization = undefined;
  });
  return { type: "oauth", token: await authorization };
}
