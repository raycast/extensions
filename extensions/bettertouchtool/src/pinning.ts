export function parsePinnedIds(value: unknown): string[] {
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))];
  } catch {
    return [];
  }
}

export function togglePinnedId(pinnedIds: readonly string[], id: string): string[] {
  return pinnedIds.includes(id) ? pinnedIds.filter((pinnedId) => pinnedId !== id) : [id, ...pinnedIds];
}

export function sortPinnedItems<T>(
  items: readonly T[],
  pinnedIds: ReadonlySet<string>,
  getId: (item: T) => string,
): T[] {
  return items
    .map((item, index) => ({ item, index, pinned: pinnedIds.has(getId(item)) }))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || left.index - right.index)
    .map(({ item }) => item);
}
