import { isNotionOAuthConfigured } from "./constants";
import { notionOAuthService } from "./service";
import { notionOAuthClient } from "./client";
import { clearOAuthStorage, loadOAuthAccessToken, saveOAuthAccessToken, syncOAuthPreferencesFromPkce } from "./storage";

export async function getNotionOAuthAccessToken(): Promise<string | undefined> {
  return loadOAuthAccessToken();
}

export async function authorizeNotion(): Promise<string> {
  if (!isNotionOAuthConfigured()) {
    throw new Error(
      "Notion OAuth is not configured in this build. Use Extension Preferences for manual Connect setup, or add OAuth constants before publishing.",
    );
  }

  const existingToken = await loadOAuthAccessToken();
  if (existingToken) {
    return existingToken;
  }

  const accessToken = await notionOAuthService.authorize();
  await saveOAuthAccessToken(accessToken);
  await syncOAuthPreferencesFromPkce();

  const savedToken = await loadOAuthAccessToken();
  if (!savedToken) {
    throw new Error("Notion connected, but the access token could not be saved.");
  }

  return accessToken;
}

export async function disconnectNotionOAuth(): Promise<void> {
  await notionOAuthClient.removeTokens();
  await clearOAuthStorage();
}
