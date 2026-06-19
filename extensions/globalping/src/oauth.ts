import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const GLOBALPING_AUTH_CLIENT_ID = "0463f7dd-71e8-4a3f-b293-4c0eb04d05ed";
const GLOBALPING_AUTH_SCOPE = "measurements";
const GLOBALPING_AUTHORIZE_URL = "https://auth.globalping.io/oauth/authorize";
const GLOBALPING_TOKEN_URL = "https://auth.globalping.io/oauth/token";

const globalpingOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Globalping",
  providerIcon: "globalping.png",
  providerId: "globalping",
  description: "Connect your Globalping account to get started.",
});

export const globalpingOAuth = new OAuthService({
  client: globalpingOAuthClient,
  clientId: GLOBALPING_AUTH_CLIENT_ID,
  scope: GLOBALPING_AUTH_SCOPE,
  authorizeUrl: GLOBALPING_AUTHORIZE_URL,
  tokenUrl: GLOBALPING_TOKEN_URL,
  refreshTokenUrl: GLOBALPING_TOKEN_URL,
  bodyEncoding: "url-encoded",
});
