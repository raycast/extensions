import { UpdateKeywordsPromiseResult } from "../types";

/**
 * Updates form's selected keywords based on add/remove operations
 */
export function syncFormKeywords(
  result: UpdateKeywordsPromiseResult,
  currentSelected: string[],
  onChange: (value: string[]) => void,
): void {
  const { validKeywords, removedKeywords } = result;
  let updatedSelected = [...currentSelected];

  // Add newly valid keywords to selected keywords
  if (validKeywords.length > 0) {
    const newKeywords = validKeywords.filter((keyword) => !updatedSelected.includes(keyword));
    updatedSelected = [...updatedSelected, ...newKeywords];
  }

  // Remove deleted keywords from selected keywords
  if (removedKeywords.length > 0) {
    updatedSelected = updatedSelected.filter((keyword) => !removedKeywords.includes(keyword));
  }

  // Only update if there are actual changes
  if (
    updatedSelected.length !== currentSelected.length ||
    !updatedSelected.every((keyword) => currentSelected.includes(keyword))
  ) {
    onChange(updatedSelected);
  }
}
