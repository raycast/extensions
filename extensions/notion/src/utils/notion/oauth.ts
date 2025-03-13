import { Client } from "@notionhq/client";
import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const { notion_token } = getPreferenceValues();

// Initialize the client with the personal access token if available
let notion: Client | null = null;
if (notion_token) {
  notion = new Client({
    auth: notion_token,
    timeoutMs: 10000, // 10 second timeout
  });
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerIcon: "notion-logo.png",
  providerId: "notion",
  description: "Connect your Notion account",
});

export const notionService = new OAuthService({
  client,
  clientId: "c843219a-d93c-403c-8e4d-e8aa9a987494",
  scope: "",
  authorizeUrl: "https://notion.oauth.raycast.com/authorize",
  tokenUrl: "https://notion.oauth.raycast.com/token",
  personalAccessToken: notion_token,
  extraParameters: { owner: "user" },
  onAuthorize({ token }) {
    notion = new Client({
      auth: token,
      timeoutMs: 10000, // 10 second timeout
    });
  },
});

export function getNotionClient() {
  if (!notion) {
    if (notion_token) {
      notion = new Client({
        auth: notion_token,
        timeoutMs: 10000, // 10 second timeout
      });
    } else {
      throw new Error("No Notion client initialized and no token available");
    }
  }
  return notion;
}

// Export a function to get the token for AI tools
export function getNotionToken() {
  return notion_token;
}

// Wrapper function to handle token and client initialization for all tools
export async function withNotionClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = getNotionClient();
  return fn(client);
}
