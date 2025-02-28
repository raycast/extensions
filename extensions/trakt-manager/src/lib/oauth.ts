import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { TRAKT_APP_URL, TRAKT_CLIENT_ID } from "./constants";

const AuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Trakt",
  providerIcon: "trakt.png",
  description: "Connect your Trakt account…",
  providerId: "trakt",
});

export const AuthProvider = new OAuthService({
  client: AuthClient,
  clientId: TRAKT_CLIENT_ID,
  scope: "",
  authorizeUrl: `${TRAKT_APP_URL}/oauth/authorize`,
  tokenUrl: `${TRAKT_APP_URL}/oauth/token`,
  refreshTokenUrl: `${TRAKT_APP_URL}/oauth/token`,
  bodyEncoding: "url-encoded",
});
