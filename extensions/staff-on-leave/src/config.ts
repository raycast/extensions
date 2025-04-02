import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  notionApiKey: string;
  notionDatabaseId: string;
}

export const getConfig = (): Preferences => {
  const preferences = getPreferenceValues<Preferences>();

  // Validate required preferences
  if (!preferences.notionApiKey) {
    throw new Error("Notion API Key is required in preferences");
  }

  if (!preferences.notionDatabaseId) {
    throw new Error("Notion Database ID is required in preferences");
  }

  return preferences;
};
