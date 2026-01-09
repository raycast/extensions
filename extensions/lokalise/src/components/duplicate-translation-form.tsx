import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { Platform } from "../types";
import { client } from "../api/client";
import type { ProcessedTranslationKey } from "../api/client";
import { AddTranslationForm } from "./add-translation-form";

interface DuplicateTranslationFormProps {
  keyId?: number;
  keyData?: ProcessedTranslationKey;
}

export function DuplicateTranslationForm({ keyId, keyData }: DuplicateTranslationFormProps) {
  // If keyData is provided, use it directly. Otherwise, fetch from database
  const { data: fetchedKey, isLoading } = useCachedPromise(
    async (id: number) => {
      return await client.getKeyFromDatabase(id);
    },
    [keyId!],
    {
      execute: !keyData && !!keyId,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "Failed to load key details",
        });
      },
    },
  );

  const fullKey = keyData || fetchedKey;

  // Don't render anything while loading - wait for data
  if (isLoading || !fullKey) {
    return null;
  }

  const platform = (fullKey.platforms.length > 0 ? fullKey.platforms[0] : "web") as Platform;
  const assignedFile = fullKey.filenames?.[platform] || "none";
  const screenshotUrls = fullKey.screenshots.map((s) => s.url);

  // Add suffix to avoid duplicate key names
  const duplicatedKeyName = `${fullKey.keyName}_copy`;

  return (
    <AddTranslationForm
      draftValues={{
        keyName: duplicatedKeyName,
        translationValue: fullKey.defaultTranslation,
        description: fullKey.description,
        isPlural: fullKey.isPlural,
        platform: platform,
        assignedFile: assignedFile,
        screenshotUrls,
      }}
    />
  );
}
