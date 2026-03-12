import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Done Bear",
  providerIcon: "extension-icon.png",
  providerId: "donebear",
  description: "Connect your Done Bear account",
});

const SUPABASE_URL = "https://kdarvputxmlxqemisnbh.supabase.co";

export const oauthService = new OAuthService({
  client,
  clientId: "9da7a07a-eb36-4f22-a5d1-1149a01edd8b",
  authorizeUrl: `${SUPABASE_URL}/auth/v1/oauth/authorize`,
  tokenUrl: `${SUPABASE_URL}/auth/v1/oauth/token`,
  scope: "",
  bodyEncoding: "url-encoded",
});
