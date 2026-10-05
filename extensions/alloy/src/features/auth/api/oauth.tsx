import { BASE_URL } from "@/lib/config";
import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const clientId = "dffdc345fbe3924a7c2e1b187942dec2";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Alloy",
  providerIcon: "logo-small.png",
  providerId: "alloy",
  description: "Sign in to continue",
});

export const provider = new OAuthService({
  client,
  clientId,
  scope: "alloy",
  authorizeUrl: `${BASE_URL}/api/auth/raycast/start`,
  tokenUrl: `${BASE_URL}/api/auth/raycast/token`,
});
