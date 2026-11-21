export const MAX_RECENTS = 8;

export function withRecent(recents: readonly string[], query: string): string[] {
  const added = query.trim();
  if (!added) return [...recents];
  const others = recents.filter((recent) => recent.toLowerCase() !== added.toLowerCase());
  return [added, ...others].slice(0, MAX_RECENTS);
}

export function matchingRecents(recents: readonly string[], draft: string): string[] {
  const needle = draft.trim().toLowerCase();
  return recents.filter((recent) => recent.toLowerCase().includes(needle));
}
