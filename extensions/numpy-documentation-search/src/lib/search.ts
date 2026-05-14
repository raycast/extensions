import type { InventoryItem } from "./inventory";

interface ScoredItem {
  item: InventoryItem;
  score: number;
}

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
    .sort((a, b) => b.score - a.score || a.item.shortName.localeCompare(b.item.shortName))
    .slice(0, limit)
    .map((entry) => entry.item);
}

function scoreItem(item: InventoryItem, query: string): { score: number; matched: boolean } {
  const lowerName = item.name.toLowerCase();
  const lowerShort = item.shortName.toLowerCase();
  const lowerDisplay = item.displayName.toLowerCase();

  let score = 0;

  if (lowerName === `numpy.${query}` || lowerShort === query) {
    score = 120;
  } else if (lowerShort.startsWith(query)) {
    score = 100 - Math.min(30, lowerShort.length - query.length);
  } else if (lowerName.startsWith(`numpy.${query}`)) {
    const delta = lowerName.length - `numpy.${query}`.length;
    score = 90 - Math.min(30, Math.max(0, delta));
  } else if (lowerShort.includes(query)) {
    score = 70;
  } else if (lowerName.includes(query)) {
    score = 60;
  } else if (lowerDisplay.includes(query)) {
    score = 50;
  }

  if (score > 0) {
    const segmentPenalty = lowerShort.split(".").length - 1;
    score -= segmentPenalty * 5;
  }

  return { score, matched: score > 0 };
}
