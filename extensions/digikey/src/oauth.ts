import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const { client_id, client_secret, is_sandbox } = getPreferenceValues<ExtensionPreferences>();

const BASE_URL = is_sandbox ? "https://sandbox-api.digikey.com/v1/oauth2" : "https://api.digikey.com/v1/oauth2";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "DigiKey",
  providerIcon: "digikey.png",
  providerId: "digikey",
  description: "Connect your DigiKey account",
});

export const provider = new OAuthService({
  client,
  clientId: client_id,
  scope: "",
  authorizeUrl: BASE_URL + "/authorize",
  tokenUrl: BASE_URL + "/token",
  bodyEncoding: "url-encoded",
  extraParameters: {
    clientSecret: client_secret,
  },
});
