import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { Dub } from "dub";
import { workspaceApiKey } from "@utils/env";

let dub: Dub | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Dub",
  providerIcon: "command-icon.png",
  providerId: "dub",
  description: "Connect your Dub account",
});

export const dubOAuth = new OAuthService({
  client,
  clientId: "dub_app_cf2e6f232bd9b1ca5918bc130b61ca127c2f1557ffcc95c4",
  scope: ["workspaces.read", "links.write", "tags.read", "domains.read"].join(" "),
  authorizeUrl: "https://app.dub.co/oauth/authorize",
  tokenUrl: "https://api.dub.co/oauth/token",
  refreshTokenUrl: "https://api.dub.co/oauth/token",
  bodyEncoding: "url-encoded",
  personalAccessToken: workspaceApiKey,
  onAuthorize({ token }) {
    dub = new Dub({
      token,
    });
  },
});

export function getDubClient() {
  if (!dub) {
    throw new Error("No Dub client initialized. Please connect your Dub account.");
  }

  return dub;
}
