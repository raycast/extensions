import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { Preferences } from "@today/common/types";
import { Notion } from "@today/common/utils/notion";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerIcon: "notion-logo.png",
  providerId: "notion",
  description: "Connect your Notion account",
});

const { notion_token } = getPreferenceValues<Preferences>();

export const notionService = new OAuthService({
  client,
  clientId: "73f5d4fa-f09a-40e6-82a0-431fc558ac15",
  scope: "",
  authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
  tokenUrl: "https://today-nu-pearl.vercel.app/api/token",
  personalAccessToken: notion_token,
  extraParameters: {
    owner: "user",
    redirect_uri: "https://raycast.com/redirect/extension",
  },
  onAuthorize({ token }) {
    Notion.init(token);
  },
});
