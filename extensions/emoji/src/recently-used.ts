export const RECENTLY_USED_LIMIT = 25;

export function updateRecentlyUsed(list: string[], emoji: string, limit = RECENTLY_USED_LIMIT): string[] {
  return [...new Set([emoji, ...list])].slice(0, limit);
}
