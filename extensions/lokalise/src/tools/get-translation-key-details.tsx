import { client } from "../api/client";

interface GetTranslationKeyDetailsArgs {
  keyName: string;
}

export default async function GetTranslationKeyDetails(args: GetTranslationKeyDetailsArgs) {
  try {
    const { keyName } = args;

    if (!keyName || keyName.trim().length === 0) {
      return {
        success: false,
        error: "Key name cannot be empty",
      };
    }

    const keys = await client.listKeysFromDatabase({
      searchQuery: keyName,
      limit: 10,
    });

    const exactMatch = keys.find((k) => k.keyName === keyName);

    if (!exactMatch) {
      return {
        success: false,
        error: `Translation key "${keyName}" not found`,
        suggestions: keys.length > 0 ? keys.map((k) => k.keyName) : [],
      };
    }

    return {
      success: true,
      message: `Found translation key "${keyName}"`,
      key: {
        keyName: exactMatch.keyName,
        defaultTranslation: exactMatch.defaultTranslation,
        description: exactMatch.description || "No description",
        platforms: exactMatch.platforms,
        isPlural: exactMatch.isPlural,
        tags: exactMatch.tags,
        context: exactMatch.context,
        createdAt: exactMatch.createdAt,
        modifiedAt: exactMatch.modifiedAt,
        translations: exactMatch.translations.map((t) => ({
          language: t.languageName,
          languageIso: t.languageIso,
          text: t.text,
        })),
        screenshots: exactMatch.screenshots.map((s) => ({
          title: s.title,
          url: s.url,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get translation key details",
    };
  }
}
