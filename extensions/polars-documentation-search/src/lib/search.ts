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

  const topCandidates: ScoredItem[] = [];

  for (const item of items) {
    const { score, matched } = scoreItem(item, normalized);
    if (!matched) {
      continue;
    }

    insertCandidate(topCandidates, { item, score }, limit);
  }

  return topCandidates.map((entry) => entry.item);
}

function compareScoredItems(a: ScoredItem, b: ScoredItem): number {
  return b.score - a.score || a.item.shortName.localeCompare(b.item.shortName);
}

function insertCandidate(topCandidates: ScoredItem[], candidate: ScoredItem, limit: number): void {
  if (limit <= 0) {
    return;
  }

  if (topCandidates.length === limit && compareScoredItems(candidate, topCandidates[topCandidates.length - 1]) >= 0) {
    return;
  }

  let insertIndex = topCandidates.length;
  for (let index = 0; index < topCandidates.length; index += 1) {
    if (compareScoredItems(candidate, topCandidates[index]) < 0) {
      insertIndex = index;
      break;
    }
  }

  topCandidates.splice(insertIndex, 0, candidate);
  if (topCandidates.length > limit) {
    topCandidates.pop();
  }
}

function scoreItem(item: InventoryItem, query: string): { score: number; matched: boolean } {
  const lowerName = item.name.toLowerCase();
  const lowerShort = item.shortName.toLowerCase();
  const lowerDisplay = item.displayName.toLowerCase();

  let score = 0;

  if (lowerName === `polars.${query}` || lowerShort === query) {
    score = 120;
  } else if (lowerShort.startsWith(query)) {
    score = 100 - Math.min(30, lowerShort.length - query.length);
  } else if (lowerName.startsWith(`polars.${query}`)) {
    const delta = lowerName.length - `polars.${query}`.length;
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
