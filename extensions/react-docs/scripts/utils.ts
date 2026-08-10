export interface DocEntry {
  id: string;
  type: string;
  title: string;
  url: string;
}

export const BASE_URL = "https://react.dev";

/**
 * Cleans and normalizes documentation entry titles
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/`/g, "")
    .replace(/<>.*?<\/>/g, "Fragment")
    .replace(/"/g, "'") // Replace double quotes with single quotes
    .replace(/"/g, "'") // Replace fancy double quotes
    .replace(/"/g, "'") // Replace fancy double quotes
    .trim();
}

/**
 * Removes duplicate entries and assigns sequential IDs
 */
export function deduplicateAndAssignIds(entries: DocEntry[]): DocEntry[] {
  const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());

  uniqueEntries.forEach((entry, index) => {
    entry.id = String(index + 1);
  });

  return uniqueEntries;
}

/**
 * Sorts documentation entries by type and title
 */
export function sortEntries(entries: DocEntry[]): DocEntry[] {
  const typeOrder = [
    // Reference
    "hooks",
    "components",
    "APIs",
    "legacy",
    "DOM components",
    "DOM APIs",
    "resource preloading",
    "server APIs",
    // Learn
    "learn",
    // Community & Blog
    "community",
    "blog",
  ];

  return entries.sort((a, b) => {
    const aIndex = typeOrder.indexOf(a.type);
    const bIndex = typeOrder.indexOf(b.type);

    // Unknown types go to the end
    const aOrder = aIndex === -1 ? typeOrder.length : aIndex;
    const bOrder = bIndex === -1 ? typeOrder.length : bIndex;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.title.localeCompare(b.title);
  });
}

/**
 * Generates a breakdown of entries by type
 */
export function getTypeBreakdown(entries: DocEntry[]): Record<string, number> {
  return entries.reduce(
    (acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}
