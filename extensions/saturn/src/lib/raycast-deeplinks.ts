/** Deeplinks that open Saturn commands in Raycast (Beta scheme first). */
export const RAYCAST_SEARCH_DEEPLINKS = [
  "raycast-x://extensions/sachindabas/saturn/search-links",
  "raycast://extensions/sachindabas/saturn/search-links",
] as const;

export const RAYCAST_SAVE_DEEPLINKS = [
  "raycast-x://extensions/sachindabas/saturn/save-link",
  "raycast://extensions/sachindabas/saturn/save-link",
] as const;

/** Optional initial query, e.g. for `…/search-links?arguments={"query":"raycast"}` */
export function raycastSearchDeeplink(query?: string): string {
  const base = RAYCAST_SEARCH_DEEPLINKS[1];
  const trimmed = query?.trim();
  if (!trimmed) return base;
  return `${base}?arguments=${encodeURIComponent(JSON.stringify({ query: trimmed }))}`;
}
