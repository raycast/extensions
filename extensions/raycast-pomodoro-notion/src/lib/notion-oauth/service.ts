import { OAuthService } from "@raycast/utils";

import { notionOAuthClient } from "./client";
import { NOTION_OAUTH_AUTHORIZE_URL, NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_TOKEN_URL } from "./constants";

export const notionOAuthService = new OAuthService({
  client: notionOAuthClient,
  clientId: NOTION_OAUTH_CLIENT_ID,
  scope: "",
  authorizeUrl: NOTION_OAUTH_AUTHORIZE_URL,
  tokenUrl: NOTION_OAUTH_TOKEN_URL,
  // Notion token endpoint expects JSON (official Raycast Notion extension uses this default).
  bodyEncoding: "json",
  extraParameters: {
    owner: "user",
  },
});
