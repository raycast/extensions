import { getNotionOAuthAccessToken } from "./notion-oauth/authorize";
import { loadOAuthAccessToken, loadOAuthDatabaseSelection } from "./notion-oauth/storage";
import { getNotionSettings } from "./preferences";

export type NotionAuthSource = "manual" | "oauth";

export type NotionAuth = {
  token: string;
  databaseId: string;
  source: NotionAuthSource;
  databaseTitle?: string;
};

export async function getNotionAuth(): Promise<NotionAuth | null> {
  const manual = getNotionSettings();
  const oauthToken = await getNotionOAuthAccessToken();
  const oauthDatabase = await loadOAuthDatabaseSelection();

  if (manual.notionToken && manual.notionDatabaseId) {
    return {
      token: manual.notionToken,
      databaseId: manual.notionDatabaseId,
      source: "manual",
    };
  }

  if (oauthToken && oauthDatabase) {
    return {
      token: oauthToken,
      databaseId: oauthDatabase.databaseId,
      source: "oauth",
      databaseTitle: oauthDatabase.databaseTitle,
    };
  }

  if (oauthToken && manual.notionDatabaseId) {
    return {
      token: oauthToken,
      databaseId: manual.notionDatabaseId,
      source: "oauth",
    };
  }

  if (manual.notionToken && oauthDatabase) {
    return {
      token: manual.notionToken,
      databaseId: oauthDatabase.databaseId,
      source: "manual",
      databaseTitle: oauthDatabase.databaseTitle,
    };
  }

  return null;
}

export async function describeNotionAuthGap(): Promise<string> {
  const manual = getNotionSettings();
  const token = await loadOAuthAccessToken();
  const database = await loadOAuthDatabaseSelection();

  const parts: string[] = [];
  if (!token && !manual.notionToken) {
    parts.push("token missing");
  }
  if (!database && !manual.notionDatabaseId) {
    parts.push("database missing");
  }

  if (parts.length > 0) {
    return `Notion setup incomplete (${parts.join(", ")}). Open Configure Notion → Connect + Choose Database → Validate.`;
  }

  return "Open Configure Notion → Validate Connection, then retry saving the work log.";
}

export async function getNotionAuthStatus(): Promise<{
  manualConfigured: boolean;
  oauthConnected: boolean;
  oauthDatabaseSelected: boolean;
  auth: NotionAuth | null;
}> {
  const manual = getNotionSettings();
  const oauthToken = await getNotionOAuthAccessToken();
  const oauthDatabase = await loadOAuthDatabaseSelection();
  const auth = await getNotionAuth();

  return {
    manualConfigured: Boolean(manual.notionToken && manual.notionDatabaseId),
    oauthConnected: Boolean(oauthToken),
    oauthDatabaseSelected: Boolean(oauthDatabase),
    auth,
  };
}
