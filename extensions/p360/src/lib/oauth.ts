import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

// Raycast PKCE Proxy URLs
const AUTHORIZE_URL =
  "https://oauth.raycast.com/v1/authorize/Bpe2dWKd2o6c2C2HqI1DaTVedcIexWBXu-zP3ZVhWF5yM406BNGmCp49DyLVVEtVuWKLQ8ckckRWPRyRtkw75IWJxuBwS5R39a7ZdkCHtaoYFpDcrK6bnDVQh7XSwxXJLcJZZoOmexRywgLuxj8VaeAB1g";
const TOKEN_URL =
  "https://oauth.raycast.com/v1/token/-v8_ANmsId7u79ccHwoDeW_JSrtKl5Ajc6gNCxen62f1ckO45zGRQS56Mj9kEj4Ql9pG3-tZcLIMLtmQnOntWhrFPa3qd3yBYKAfruC4ZvcgU-SCB_cRlmZL-5tb959er3KC9b35fwBjbKrZ-g";

// Oura Client ID (public, safe to include)
const CLIENT_ID = "095f7bec-5809-4ec1-a9f4-55781263e521";

// Create PKCE client
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Oura",
  providerIcon: "oura-icon.png",
  providerId: "oura",
  description: "Connect your Oura Ring to check decision readiness",
});

// Create OAuth service
export const ouraOAuth = new OAuthService({
  client,
  clientId: CLIENT_ID,
  scope: "daily heartrate personal",
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
});
