import type { IconItem, Variant } from "./catalogue";

export type Style = "all" | Variant;

const VARIANTS: readonly string[] = ["filled", "duotone"];

/** How well a word matches an item, best first. undefined means no match. */
function rank(item: IconItem, word: string): number | undefined {
  // "heart filled" means the filled heart, not icons tagged "filled"
  if (VARIANTS.includes(word)) return item.variant === word ? 0 : undefined;

  // Copied names are searchable too: heart-filled, HeartFilled
  const names = [item.name, item.slug, item.component.toLowerCase()];
  if (names.includes(word)) return 0;
  if (names.some((name) => name.startsWith(word))) return 1;
  if (names.some((name) => name.includes(word))) return 2;
  if (item.aliases.some((alias) => alias.includes(word))) return 3;
  if (item.keywords.some((keyword) => keyword.includes(word))) return 4;
  // Use cases are sentences, so match the start of a word: "art" shouldn't find "start"
  if (item.useCases.some((useCase) => ` ${useCase}`.includes(` ${word}`))) return 5;
  return undefined;
}

/** Items in the chosen style matching every word, best first. Equal matches keep their order, so pairs stay together. */
export function search(items: IconItem[], query: string, style: Style = "all"): IconItem[] {
  const inStyle = style === "all" ? items : items.filter((item) => item.variant === style);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return inStyle;

  const scored: { item: IconItem; score: number }[] = [];
  for (const item of inStyle) {
    let score = 0;
    for (const word of words) {
      const wordRank = rank(item, word);
      if (wordRank === undefined) {
        score = -1;
        break;
      }
      score += wordRank;
    }
    if (score >= 0) scored.push({ item, score });
  }
  return scored.sort((a, b) => a.score - b.score).map(({ item }) => item);
}
