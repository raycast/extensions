import { environment, LocalStorage } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { notionOAuthClient } from "./client";

const PREFERENCES_KEY = "NOTION_OAUTH_PREFERENCES";
const PREFERENCES_FILE = join(environment.supportPath, "notion-oauth-preferences.json");

export type OAuthDatabaseSelection = {
  databaseId: string;
  databaseTitle: string;
};

export type NotionOAuthPreferences = {
  accessToken?: string;
  databaseId?: string;
  databaseTitle?: string;
};

export type NotionOAuthDiagnostics = {
  hasPkceToken: boolean;
  hasStoredToken: boolean;
  hasDatabasePreferences: boolean;
  preferencesFile: string;
};

async function readPreferencesFromLocalStorage(): Promise<NotionOAuthPreferences | null> {
  const raw = await LocalStorage.getItem(PREFERENCES_KEY);
  if (typeof raw !== "string" || !raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as NotionOAuthPreferences;
  } catch {
    return null;
  }
}

function readPreferencesFromFile(): NotionOAuthPreferences | null {
  if (!existsSync(PREFERENCES_FILE)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(PREFERENCES_FILE, "utf8")) as NotionOAuthPreferences;
  } catch {
    return null;
  }
}

async function loadPreferences(): Promise<NotionOAuthPreferences | null> {
  const fromFile = readPreferencesFromFile();
  if (fromFile?.accessToken || fromFile?.databaseId) {
    return fromFile;
  }

  return readPreferencesFromLocalStorage();
}

async function savePreferences(preferences: NotionOAuthPreferences): Promise<void> {
  const payload = JSON.stringify(preferences, null, 2);
  await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(PREFERENCES_FILE, payload, "utf8");
}

export async function syncOAuthPreferencesFromPkce(): Promise<NotionOAuthPreferences | null> {
  const tokenSet = await notionOAuthClient.getTokens();
  const existing = (await loadPreferences()) ?? {};

  if (tokenSet?.accessToken) {
    const merged: NotionOAuthPreferences = {
      ...existing,
      accessToken: tokenSet.accessToken,
    };
    await savePreferences(merged);
    return merged;
  }

  return existing.accessToken || existing.databaseId ? existing : null;
}

export async function saveOAuthAccessToken(token: string): Promise<void> {
  const existing = (await loadPreferences()) ?? {};
  await savePreferences({
    ...existing,
    accessToken: token,
  });
}

export async function loadOAuthAccessToken(): Promise<string | undefined> {
  const synced = await syncOAuthPreferencesFromPkce();
  if (synced?.accessToken) {
    return synced.accessToken;
  }

  const preferences = await loadPreferences();
  return preferences?.accessToken;
}

export async function saveOAuthDatabaseSelection(selection: OAuthDatabaseSelection): Promise<void> {
  const existing = (await loadPreferences()) ?? {};
  await savePreferences({
    ...existing,
    databaseId: selection.databaseId,
    databaseTitle: selection.databaseTitle,
  });
}

export async function loadOAuthDatabaseSelection(): Promise<OAuthDatabaseSelection | null> {
  const preferences = await loadPreferences();
  if (!preferences?.databaseId) {
    return null;
  }

  return {
    databaseId: preferences.databaseId,
    databaseTitle: preferences.databaseTitle ?? "Selected database",
  };
}

export async function clearOAuthStorage(): Promise<void> {
  await LocalStorage.removeItem(PREFERENCES_KEY);
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(PREFERENCES_FILE);
  } catch {
    // ignore missing file
  }
}

export async function getNotionOAuthDiagnostics(): Promise<NotionOAuthDiagnostics> {
  const tokenSet = await notionOAuthClient.getTokens();
  const preferences = await loadPreferences();

  return {
    hasPkceToken: Boolean(tokenSet?.accessToken),
    hasStoredToken: Boolean(preferences?.accessToken),
    hasDatabasePreferences: Boolean(preferences?.databaseId),
    preferencesFile: PREFERENCES_FILE,
  };
}

export async function testOAuthStorageWrite(): Promise<{ ok: boolean; message: string }> {
  const marker = `storage-test-${Date.now()}`;
  try {
    await savePreferences({
      accessToken: marker,
      databaseId: "test-database-id",
      databaseTitle: "Storage test",
    });
    const preferences = await loadPreferences();
    if (preferences?.accessToken !== marker) {
      return { ok: false, message: "Write succeeded but read-back failed." };
    }
    await clearOAuthStorage();
    return { ok: true, message: "LocalStorage + preferences file write OK." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage error";
    return { ok: false, message };
  }
}
