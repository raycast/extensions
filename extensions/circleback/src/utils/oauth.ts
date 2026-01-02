import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { APP_URL } from "../constants/raycast";

const OAUTH_CLIENT_ID = "8508ff8642cb38ad8e13c45726a09874";
const MEETINGS_AUTH_SCOPE = "user:meetings";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Circleback",
  providerIcon: "extension-icon.png",
  description: "Connect your Circleback account to use this extension.",
});

export const oauthService = new OAuthService({
  bodyEncoding: "url-encoded",
  authorizeUrl: `${APP_URL}/api/oauth/authorize`,
  tokenUrl: `${APP_URL}/api/oauth/access-token`,
  refreshTokenUrl: `${APP_URL}/api/oauth/refresh-token`,
  client,
  clientId: OAUTH_CLIENT_ID,
  scope: MEETINGS_AUTH_SCOPE,
  extraParameters: {
    client_type: "Raycast",
  },
});
