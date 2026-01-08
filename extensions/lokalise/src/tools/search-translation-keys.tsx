import type { Platform } from "./types";
import { client } from "../api/client";

interface SearchTranslationKeysArgs {
  query: string;
  platform?: Platform;
}

/**
 * AI Tool: Search for translation keys in Lokalise
 * This tool allows Raycast AI to search through existing translation keys
 */
export default async function SearchTranslationKeys(args: SearchTranslationKeysArgs) {
  try {
    const { query, platform } = args;

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: "Search query cannot be empty",
      };
    }

    // Search in the local database for fast results
    const keys = await client.listKeysFromDatabase({
      searchQuery: query,
      platforms: platform ? [platform] : undefined,
      searchInTranslations: true,
      limit: 20, // Limit results for AI context
    });

    if (keys.length === 0) {
      return {
        success: true,
        message: `No translation keys found matching "${query}"`,
        keys: [],
      };
    }

    // Format results for AI consumption
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
