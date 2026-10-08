import type { SearchResult } from "../types";

export function resolveSelectedItemId(
  results: readonly SearchResult[],
  warningIds: readonly string[],
  selectedId: string | null | undefined,
): string | undefined {
  if (
    selectedId != null &&
    (results.some(({ entry }) => entry.id === selectedId) ||
      warningIds.includes(selectedId))
  )
    return selectedId;
  return results[0]?.entry.id ?? warningIds[0];
}
