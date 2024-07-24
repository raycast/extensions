import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { DUB_CLIENT_ID } from "@utils/constants";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dub",
  providerIcon: "command-icon.png",
  providerId: "dub",
  description: "Connect your Dub account",
});

export const dubOAuth = new OAuthService({
  client,
  clientId: DUB_CLIENT_ID,
  scope: "workspaces.read links.write tags.read domains.read",
  authorizeUrl: "https://app.dub.co/oauth/authorize",
  tokenUrl: "https://api.dub.co/oauth/token",
  refreshTokenUrl: "https://api.dub.co/oauth/token",
  extraParameters: {
    grant_type: "refresh_token",
  },
  onAuthorize({ token }) {
    console.log("Dub token", { token });
  },
});
