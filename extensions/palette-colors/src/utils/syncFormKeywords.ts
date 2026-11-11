import { UpdateKeywordsPromiseResult } from "../types";

/**
 * Returns the form's selected keywords after an Update Keywords operation:
 * new and already-existing keywords get selected, removed ones get deselected.
 */
export function syncFormKeywords(result: UpdateKeywordsPromiseResult, currentSelected: string[]): string[] {
  const { validKeywords, duplicateKeywords, removedKeywords } = result;
  const selected = new Set(currentSelected);

  [...validKeywords, ...duplicateKeywords].forEach((keyword) => selected.add(keyword));
  removedKeywords.forEach((keyword) => selected.delete(keyword));

  return [...selected];
}
