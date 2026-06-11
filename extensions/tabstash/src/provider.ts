import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "TabStash",
  providerIcon: "icon.png",
  providerId: "tabstash",
  description: "Connect your TabStash account",
});

// Public PKCE client ID — provisioned via Terraform (auth0_client.tabstash_raycast).
const CLIENT_ID = "G43pDjkuSNL0dougcupbfm0apOb1kZBH";

export const provider = new OAuthService({
  client,
  clientId: CLIENT_ID,
  scope: "openid profile email offline_access",
  authorizeUrl: "https://auth.unstablestudios.com/authorize",
  tokenUrl: "https://auth.unstablestudios.com/oauth/token",
  refreshTokenUrl: "https://auth.unstablestudios.com/oauth/token",
  extraParameters: {
    audience: "https://api.tabsta.sh",
  },
  bodyEncoding: "url-encoded",
});
