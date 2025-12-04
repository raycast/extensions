import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { Dub } from "dub";

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
  clientId: "dub_app_d70ed8f23a7eb32a0532776e5de0be08796cc82e12a3c806",
  scope: ["links.write", "tags.write", "workspaces.read", "domains.read"].join(" "),
  authorizeUrl: "https://app.dub.co/oauth/authorize",
  tokenUrl: "https://api.dub.co/oauth/token",
  refreshTokenUrl: "https://api.dub.co/oauth/token",
  bodyEncoding: "url-encoded",
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
