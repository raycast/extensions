import { EXTRA_ALIASES } from "./aliases";

export type SearchableEmoji = {
  emoji: string;
  description: string;
  shortCode?: string[];
  keywords?: string[];
  category?: string;
};
type SearchOptions<T extends SearchableEmoji> = { category?: string; recentlyUsed?: T[]; limit?: number };
function normalize(value: string): string {
  const bare = value.trim().replace(/^:+|:+$/gu, "");
  if (bare === "+1") return "plus one";
  if (bare === "-1") return "minus one";
  return bare
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}
const tokens = (normalized: string): string[] => normalized.split(" ").filter(Boolean);
const identity = (emoji: string): string => emoji.replace(/\uFE0F/gu, "");
type Prepared<T> = {
  item: T;
  order: number;
  symbol: string;
  description: string;
  descriptionTokens: string[];
  aliases: string[];
  shortCodes: string[];
  keywords: string[];
  tokens: string[];
};
function prepare<T extends SearchableEmoji>(item: T, order: number): Prepared<T> {
  const description = normalize(item.description);
  const aliases = (EXTRA_ALIASES[item.emoji] ?? []).map(normalize);
  const shortCodes = (item.shortCode ?? []).map(normalize);
  const keywords = (item.keywords ?? []).map(normalize);
  return {
    item,
    order,
    symbol: identity(item.emoji),
    description,
    aliases,
    shortCodes,
    keywords,
    descriptionTokens: tokens(description),
    tokens: [...new Set([description, ...aliases, ...shortCodes, ...keywords].flatMap(tokens))],
  };
}
function matches(query: string[], candidate: string[], prefix = false): boolean {
  return query.every((word) => candidate.some((token) => token === word || (prefix && token.startsWith(word))));
}
function score<T>(entry: Prepared<T>, query: string, words: string[], symbol: string): number {
  if (entry.symbol === symbol) return 1100;
  if (!query) return 0;
  if (entry.description === query) return 1000;
  if (entry.aliases.includes(query)) return 975;
  if (entry.description.startsWith(query + " ")) return 950;
  if (matches(words, entry.descriptionTokens)) return 920;
  if (matches(words, entry.descriptionTokens, true)) return 880;
  if (entry.shortCodes.includes(query)) return 800;
  if (entry.keywords.includes(query)) return 780;
  if (matches(words, entry.tokens)) return 720;
  if (matches(words, entry.tokens, true)) return 680;
  return 0;
}
// Bounded edit distance, including adjacent transpositions ("rocekt").
function editDistance(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let beforePrevious = previous;
  for (let i = 1; i <= left.length; i++) {
    const row = [i];
    for (let j = 1; j <= right.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
      }
    }
    if (Math.min(...row) > limit) return limit + 1;
    beforePrevious = previous;
    previous = row;
  }
  return previous[right.length];
}
export class EmojiSearchIndex<T extends SearchableEmoji> {
  private prepared?: Prepared<T>[];
  private vocabulary?: string[];
  constructor(private readonly emojis: T[]) {}

  search(rawQuery: string, options: SearchOptions<T> = {}): T[] {
    const { category = "", recentlyUsed = [], limit = 100 } = options;
    const inCategory = (item: T) => !category || item.category === category;
    const trimmed = rawQuery.trim();
    if (!trimmed) return this.emojis.filter(inCategory);
    // Opening recents never builds a search index.
    this.prepared ??= this.emojis.map(prepare);
    const query = normalize(trimmed);
    const words = tokens(query);
    const symbol = identity(trimmed);
    const candidates = this.prepared.filter((entry) => inCategory(entry.item));
    let results = candidates
      .map((entry) => ({ entry, score: score(entry, query, words, symbol) }))
      .filter((result) => result.score > 0);
    // Every query word must match. Only try typo correction if ordinary matches fail.
    if (results.length === 0 && words.length > 0) {
      this.vocabulary ??= [...new Set(this.prepared.flatMap((entry) => entry.tokens))];
      const vocabulary = this.vocabulary;
      const corrections = words.map((word) => {
        const allowed = word.length < 4 ? 0 : word.length < 8 ? 1 : 2;
        const costs = new Map<string, number>();
        for (const token of vocabulary) {
          const distance = token.startsWith(word) ? 0 : editDistance(word, token, allowed);
          if (distance <= allowed) costs.set(token, distance);
        }
        return costs;
      });
      results = candidates.flatMap((entry) => {
        const costs = corrections.map((correction) =>
          Math.min(...entry.tokens.map((token) => correction.get(token) ?? Infinity)),
        );
        if (!costs.every(Number.isFinite)) return [];
        const fieldMatches = (field: string[]) =>
          corrections.every((correction) => field.some((token) => correction.has(token)));
        const bonus = fieldMatches(entry.descriptionTokens)
          ? 30
          : fieldMatches(entry.aliases.flatMap(tokens))
            ? 20
            : fieldMatches(entry.shortCodes.flatMap(tokens))
              ? 10
              : 0;
        return [{ entry, score: 300 + bonus - costs.reduce((total, cost) => total + cost, 0) * 50 }];
      });
    }
    const recentOrder = new Map(recentlyUsed.map((item, index) => [item.emoji, index]));
    return results
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        const a = recentOrder.get(left.entry.item.emoji) ?? Infinity;
        const b = recentOrder.get(right.entry.item.emoji) ?? Infinity;
        return a !== b ? a - b : left.entry.order - right.entry.order;
      })
      .slice(0, limit)
      .map(({ entry }) => entry.item);
  }
}
