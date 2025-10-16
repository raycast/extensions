import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const clientId = "a4f97a37-75e8-4e64-b2e1-1235d3a1152a";
const scope = [
  "read:recovery",
  "read:cycles",
  "read:workout",
  "read:sleep",
  "read:profile",
  "read:body_measurement",
  "offline",
].join(" ");

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "WHOOP",
  providerIcon: "whoop-icon.svg",
  description: "Connect your WHOOP account",
  providerId: "whoop",
});

export const provider = new OAuthService({
  client: oauthClient,
  clientId: clientId,
  authorizeUrl: "https://whoop.oauth.raycast.com/authorize",
  tokenUrl: "https://whoop.oauth.raycast.com/token",
  refreshTokenUrl: "https://whoop.oauth.raycast.com/refresh-token",
  scope: scope,
});
