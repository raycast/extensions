import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  description: "Connect your Done Bear account",
  providerIcon: "extension-icon.png",
  providerId: "donebear",
  providerName: "Done Bear",
  redirectMethod: OAuth.RedirectMethod.Web,
});

const SUPABASE_URL = "https://kdarvputxmlxqemisnbh.supabase.co";

export const oauthService = new OAuthService({
  authorizeUrl: `${SUPABASE_URL}/auth/v1/oauth/authorize`,
  bodyEncoding: "url-encoded",
  client,
  clientId: "9da7a07a-eb36-4f22-a5d1-1149a01edd8b",
  scope: "",
  tokenUrl: `${SUPABASE_URL}/auth/v1/oauth/token`,
});
