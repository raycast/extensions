import { Card, SortMode, UsageStats } from "../types";

export function sortCards(cards: Card[], mode: SortMode, usage: UsageStats): Card[] {
  const sorted = [...cards];

  switch (mode) {
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "date-added-desc":
      sorted.sort((a, b) => byNumberThenName(b.createdAtMs || b.mtimeMs, a.createdAtMs || a.mtimeMs, a, b));
      break;
    case "date-added-asc":
      sorted.sort((a, b) => byNumberThenName(a.createdAtMs || a.mtimeMs, b.createdAtMs || b.mtimeMs, a, b));
      break;
    case "date-modified-desc":
      sorted.sort((a, b) => byNumberThenName(b.mtimeMs, a.mtimeMs, a, b));
      break;
    case "date-modified-asc":
      sorted.sort((a, b) => byNumberThenName(a.mtimeMs, b.mtimeMs, a, b));
      break;
    case "size-desc":
      sorted.sort((a, b) => byNumberThenName(b.size, a.size, a, b));
      break;
    case "size-asc":
      sorted.sort((a, b) => byNumberThenName(a.size, b.size, a, b));
      break;
    case "recent":
      sorted.sort((a, b) => byNumberThenName(usage[b.path]?.lastUsedAt ?? 0, usage[a.path]?.lastUsedAt ?? 0, a, b));
      break;
    case "frequent":
      sorted.sort((a, b) => byNumberThenName(usage[b.path]?.count ?? 0, usage[a.path]?.count ?? 0, a, b));
      break;
  }

  return sorted;
}

/** Keeps ordering stable and predictable when two Cards compare equal on the primary key. */
function byNumberThenName(first: number, second: number, a: Card, b: Card): number {
  const difference = first - second;
  return difference !== 0 ? difference : a.name.localeCompare(b.name);
}
