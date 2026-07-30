import type { CheatsheetItem } from "../types";

const GENERIC_TAGS = new Set(["cli", "terminal", "slash command", "configuration", "interactive", "session", "status"]);

function commandFamily(item: CheatsheetItem): string {
  const parts = item.usage.replace(/^\//, "").split(/\s+/);
  return item.usage.startsWith("/") ? parts[0] : parts.slice(0, 2).join(" ");
}

export function getRelatedItems(item: CheatsheetItem, items: CheatsheetItem[], limit = 4): CheatsheetItem[] {
  const itemTags = new Set(item.tags.filter((tag) => !GENERIC_TAGS.has(tag.toLowerCase())));
  const family = commandFamily(item);

  return items
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => itemTags.has(tag)).length;
      const sameCategory = candidate.category === item.category ? 2 : 0;
      const sameFamily = commandFamily(candidate) === family ? 5 : 0;
      const nameReference =
        candidate.description.toLowerCase().includes(item.name.toLowerCase()) ||
        item.description.toLowerCase().includes(candidate.name.toLowerCase())
          ? 2
          : 0;
      const hasFocusedEvidence = sharedTags > 0 || sameFamily > 0 || nameReference > 0;
      return { candidate, score: sharedTags * 2 + sameCategory + sameFamily + nameReference, hasFocusedEvidence };
    })
    .filter(({ score, hasFocusedEvidence }) => hasFocusedEvidence && score > 1)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
