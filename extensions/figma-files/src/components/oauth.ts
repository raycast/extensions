import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Figma",
  providerIcon: "command-icon.png",
  description: "Connect your Figma account",
});

const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues<Preferences>();

export const figma = new OAuthService({
  client,
  clientId: "Afx7B0B39PL41r2kOkfTB2",
  authorizeUrl: "https://figma.oauth.raycast.com/authorize",
  tokenUrl: "https://figma.oauth.raycast.com/token",
  refreshTokenUrl: "https://figma.oauth.raycast.com/refresh-token",
  scope: "files:read",
  personalAccessToken: PERSONAL_ACCESS_TOKEN,
});
