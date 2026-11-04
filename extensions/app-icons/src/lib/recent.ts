const LIMIT = 6;

export function pushRecent(current: string[], term: string): string[] {
  const cleaned = term.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!cleaned) return current.slice(0, LIMIT);
  return [cleaned, ...current.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, LIMIT);
}

export function removeRecent(current: string[], term: string): string[] {
  return current.filter((item) => item !== term);
}

export const RECENT_STORAGE_KEY = "recent-searches";
