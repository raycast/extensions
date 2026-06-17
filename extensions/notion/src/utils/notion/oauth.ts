import { Client } from "@notionhq/client";
import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerIcon: "notion-logo.png",
  providerId: "notion",
  description: "Connect your Notion account",
});

const { notion_token } = getPreferenceValues<Preferences>();

let notion: Client | null = null;

export const notionService = new OAuthService({
  client,
  clientId: "c843219a-d93c-403c-8e4d-e8aa9a987494",
  scope: "",
  authorizeUrl: "https://notion.oauth.raycast.com/authorize",
  tokenUrl: "https://notion.oauth.raycast.com/token",
  personalAccessToken: notion_token,
  extraParameters: { owner: "user" },
  onAuthorize({ token }) {
    notion = new Client({ auth: token });
  },
});

export function getNotionClient() {
  if (!notion) {
    throw new Error("No Notion client initialized");
  }

  return notion;
}
