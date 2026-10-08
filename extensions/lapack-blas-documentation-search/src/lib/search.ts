import type { InventoryItem } from "./inventory";

interface ScoredItem {
  item: InventoryItem;
  score: number;
}

/**
 * Search through the inventory based on a query string.
 * @param items The inventory items to search through
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Sorted array of matching items
 */
export function searchInventory(items: InventoryItem[], query: string, limit = 30): InventoryItem[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return items.slice(0, limit);
  }

  const candidates: ScoredItem[] = [];

  for (const item of items) {
    const { score, matched } = scoreItem(item, normalized);
    if (!matched) {
      continue;
    }

    candidates.push({ item, score });
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

/**
 * Score an item based on how well it matches the query.
 * @param item The inventory item to score
 * @param query The normalized query string
 * @returns Object with score and matched flag
 */
function scoreItem(item: InventoryItem, query: string): { score: number; matched: boolean } {
  const lowerName = item.name.toLowerCase();
  const lowerDescription = item.description.toLowerCase();
  const lowerCategory = item.category.toLowerCase();

  let score = 0;

  // Exact match gets highest score
  if (lowerName === query) {
    score = 120;
  }
  // Name starts with query
  else if (lowerName.startsWith(query)) {
    score = 100 - Math.min(30, lowerName.length - query.length);
  }
  // Name contains query
  else if (lowerName.includes(query)) {
    score = 70;
  }
  // Description contains query
  else if (lowerDescription.includes(query)) {
    score = 50;
  }
  // Category contains query
  else if (lowerCategory.includes(query)) {
    score = 40;
  }

  // Boost BLAS Level 1 routines slightly (they are often most commonly used)
  if (score > 0 && item.category.includes("Level 1")) {
    score += 5;
  }

  return { score, matched: score > 0 };
}
