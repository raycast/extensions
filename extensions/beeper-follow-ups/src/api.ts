import BeeperDesktop from "@beeper/desktop-api";
import { getPreferenceValues, OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import { ReplyClient, validateBaseUrl } from "./core";
import { sdkClient } from "./sdk-client";

export type Settings = {
  baseUrl: string;
  lookbackDays: string;
  includeMuted: boolean;
};
export function settings(): Settings {
  return getPreferenceValues<Settings>();
}
export function createOAuth(): OAuthService {
  const baseURL = validateBaseUrl(
    settings().baseUrl || "http://localhost:23373",
  );
  return new OAuthService({
    client: new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.App,
      providerName: "Beeper Follow-ups",
      providerIcon: "extension-icon.png",
      providerId: "beeper-follow-ups",
      description: "Read your local conversations and prepare drafts in Beeper",
    }),
    clientId: "raycast-beeper-follow-ups-itsdanielsultan",
    scope: "read",
    authorizeUrl: `${baseURL}/oauth/authorize`,
    tokenUrl: `${baseURL}/oauth/token`,
    bodyEncoding: "url-encoded",
  });
}
export function client(): ReplyClient {
  const sdk = new BeeperDesktop({
    accessToken: getAccessToken().token,
    baseURL: validateBaseUrl(settings().baseUrl || "http://localhost:23373"),
    timeout: 10000,
    maxRetries: 1,
    logLevel: "off",
  });
  return sdkClient(sdk);
}
