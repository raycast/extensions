import { Tool } from "@raycast/api";
import type { Platform } from "./types";
import { client } from "../api/client";

type Input = {
  keyName: string;
  translationValue: string;
  description?: string;
  screenshotPaths?: string[];
  isPlural?: boolean;
  platform: Platform;
  assignedFile?: string;
};

/**
 * AI Tool: Add a new translation key to Lokalise
 * This tool allows Raycast AI to add translation keys with user confirmation
 */
export default async function AddTranslationKey(input: Input) {
  try {
    const { keyName, translationValue, description, screenshotPaths, isPlural, platform, assignedFile } = input;

    // Validate inputs
    if (!keyName || keyName.trim().length === 0) {
      return {
        success: false,
        error: "Key name cannot be empty",
      };
    }

    if (!translationValue || translationValue.trim().length === 0) {
      return {
        success: false,
        error: "Translation value cannot be empty",
      };
    }

    // Check if key already exists
    const existingKeys = await client.listKeysFromDatabase({
      searchQuery: keyName,
      limit: 5,
    });

    const exactMatch = existingKeys.find((k) => k.keyName === keyName);
    if (exactMatch) {
      return {
        success: false,
        error: `Translation key "${keyName}" already exists`,
        existingKey: {
          keyName: exactMatch.keyName,
          defaultTranslation: exactMatch.defaultTranslation,
          platforms: exactMatch.platforms,
        },
      };
    }

    // Add the key to Lokalise
    await client.createTranslationKey({
      keyName,
      translationValue,
      description,
      screenshotPaths,
      isPlural,
      platform,
      assignedFile,
    });

    return {
      success: true,
      message: `Successfully added translation key "${keyName}" to Lokalise`,
      key: {
        keyName,
        translationValue,
        platform,
        description,
        isPlural,
        assignedFile,
        screenshotCount: screenshotPaths?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add translation key",
    };
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const infoItems = [
    { name: "Key Name", value: input.keyName },
    { name: "Translation", value: input.translationValue },
    { name: "Platform", value: input.platform },
  ];

  if (input.description) {
    infoItems.push({ name: "Description", value: input.description });
  }

  if (input.isPlural) {
    infoItems.push({ name: "Is Plural", value: "Yes" });
  }

  if (input.assignedFile) {
    infoItems.push({ name: "Assigned File", value: input.assignedFile });
  }

  if (input.screenshotPaths && input.screenshotPaths.length > 0) {
    infoItems.push({ name: "Screenshots", value: `${input.screenshotPaths.length} file(s)` });
  }

  return {
    message: "Are you sure you want to add this translation key to Lokalise?",
    info: infoItems,
  };
};
