import type { Platform } from "./types";
import { client } from "../api/client";

interface SearchTranslationKeysArgs {
  query: string;
  platform?: Platform;
}

export default async function SearchTranslationKeys(args: SearchTranslationKeysArgs) {
  try {
    const { query, platform } = args;

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: "Search query cannot be empty",
      };
    }

    const keys = await client.listKeysFromDatabase({
      searchQuery: query,
      platforms: platform ? [platform] : undefined,
      searchInTranslations: true,
      limit: 20,
    });

    if (keys.length === 0) {
      return {
        success: true,
        message: `No translation keys found matching "${query}"`,
        keys: [],
      };
    }

    const formattedKeys = keys.map((key) => ({
      keyName: key.keyName,
      defaultTranslation: key.defaultTranslation,
      description: key.description || "No description",
      platforms: key.platforms,
      isPlural: key.isPlural,
      tags: key.tags,
      translations: key.translations.map((t) => ({
        language: t.languageName,
        text: t.text,
      })),
    }));

    return {
      success: true,
      message: `Found ${keys.length} translation keys matching "${query}"`,
      keys: formattedKeys,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search translation keys",
    };
  }
}
