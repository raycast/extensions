import { useLocalStorage } from "@raycast/utils";
import { PaletteFormFields, UpdateKeywordsPromiseResult, UseFormKeywordsObject } from "../types";
import { filterValidKeywords } from "../utils/keywordValidation";

type UseFormKeywordsReturn = {
  keywords: UseFormKeywordsObject;
};

/**
 * Manages persistent keyword storage with validation and add/remove functionality.
 * Provides global keyword list shared across all palettes.
 */
export function useFormKeywords(initialValues?: PaletteFormFields): UseFormKeywordsReturn {
  // Global keyword storage shared across all palettes
  const { value: keywords, setValue: setKeywords } = useLocalStorage<string[]>(
    "color-palettes-keywords",
    initialValues?.keywords || [],
  );

  /**
   * Processes keyword input and updates the global keyword list.
   */
  const updateKeywords = async (keywordsText: string): Promise<UpdateKeywordsPromiseResult> => {
    // Parse and clean input keywords
    const inputKeywords = keywordsText
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    // Separate add and remove keywords
    const addKeywords = inputKeywords.filter((k) => !k.startsWith("!"));
    const removeKeywords = inputKeywords.filter((k) => k.startsWith("!")).map((k) => k.slice(1));

    // Validate add keywords
    const validAddKeywords = filterValidKeywords(addKeywords);
    const invalidAddKeywords = addKeywords.filter((k) => !filterValidKeywords([k]).length);

    let newKeywords = [...(keywords ?? [])];
    const actuallyRemoved: string[] = [];

    // Process removal keywords first
    removeKeywords.forEach((keyword) => {
      const beforeLength = newKeywords.length;
      newKeywords = newKeywords.filter((existingTag) => existingTag !== keyword);
      if (newKeywords.length < beforeLength) {
        actuallyRemoved.push(keyword);
      }
    });

    // Process addition keywords (only valid ones that aren't duplicates)
    const actuallyAdded = validAddKeywords.filter((keyword) => {
      if (!newKeywords.includes(keyword)) {
        newKeywords.push(keyword);
        return true;
      }
      return false;
    });

    // Persist updated keywords to storage
    await setKeywords(newKeywords);

    return {
      validKeywords: actuallyAdded,
      invalidKeywords: invalidAddKeywords,
      removedKeywords: actuallyRemoved,
      duplicateKeywords: validAddKeywords.filter((k) => !actuallyAdded.includes(k)),
      totalProcessed: inputKeywords.length,
    };
  };

  return {
    keywords: {
      keywords,
      update: updateKeywords,
    },
  };
}
