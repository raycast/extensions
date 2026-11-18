export const RECENT_LIMIT = 30;

export function decodeStoredIds(value: string | number | boolean | undefined): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function sanitizeStoredIds(ids: string[], validIds: ReadonlySet<string>, limit?: number): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const id of ids) {
    if (!validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    sanitized.push(id);
    if (limit !== undefined && sanitized.length >= limit) break;
  }
  return sanitized;
}

export function toggleFavoriteId(ids: string[], id: string): { ids: string[]; isFavorite: boolean } {
  if (ids.includes(id)) return { ids: ids.filter((candidate) => candidate !== id), isFavorite: false };
  return { ids: [id, ...ids], isFavorite: true };
}

export function addRecentId(ids: string[], id: string, limit = RECENT_LIMIT): string[] {
  return [id, ...ids.filter((candidate) => candidate !== id)].slice(0, limit);
}
