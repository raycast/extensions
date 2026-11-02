import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { APP_URL } from "../constants/raycast";

const OAUTH_CLIENT_ID = "8508ff8642cb38ad8e13c45726a09874";
// The assistant endpoint requires user:write, which also covers meeting reads.
const USER_WRITE_SCOPE = "user:write";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Circleback",
  providerIcon: "extension-icon.png",
  description: "Connect your Circleback account to use this extension.",
});

const service = new OAuthService({
  bodyEncoding: "url-encoded",
  authorizeUrl: `${APP_URL}/api/oauth/authorize`,
  tokenUrl: `${APP_URL}/api/oauth/access-token`,
  refreshTokenUrl: `${APP_URL}/api/oauth/refresh-token`,
  client,
  clientId: OAUTH_CLIENT_ID,
  scope: USER_WRITE_SCOPE,
  extraParameters: {
    client_type: "Raycast",
  },
});

// Older tokens lack user:write, and some have an empty scope, so they sign in again.
export const oauthService = {
  client,
  authorize: async () => {
    const tokens = await client.getTokens();
    if (tokens && !tokens.scope?.split(" ").includes(USER_WRITE_SCOPE)) {
      await client.removeTokens();
    }
    return service.authorize();
  },
};
