import { OAuth } from "@raycast/api";
import { APP_ID } from "@/constants";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "spoo.me",
  providerIcon: "extension-icon.png",
  providerId: "spoo",
  description: "Connect your spoo.me account to shorten and manage your links.",
});

export async function buildAuthorizationRequest(apiBaseUrl: string) {
  return oauthClient.authorizationRequest({
    endpoint: `${apiBaseUrl}/auth/device/login`,
    clientId: APP_ID,
    scope: "",
    extraParameters: { app_id: APP_ID },
  });
}
