import { IconEntry } from "./types";

/** An icon with its words lowercased and split once per catalog load, so each keystroke only compares. */
export interface SearchItem {
  icon: IconEntry;
  nameWords: string[];
  namePhrase: string;
  tags: string[];
  tagWords: Set<string>;
  categoryWords: string[];
}

/** Saved custom keywords: icon name → phrases. */
export type SavedKeywords = Record<string, string[]>;

const STOPWORDS = new Set(["a", "an", "the", "for", "of", "with", "and", "or", "icon", "icons", "symbol"]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Query words, minus filler like "icon" or "for" unless that's all there is. */
export function queryTerms(query: string): string[] {
  const all = words(query);
  const meaningful = all.filter((word) => !STOPWORDS.has(word));
  return meaningful.length ? meaningful : all;
}

/** The form saved keywords are stored and compared in. */
export function normalizePhrase(query: string): string {
  return queryTerms(query).join(" ");
}

export function prepareSearch(icons: IconEntry[]): SearchItem[] {
  return icons.map((icon) => {
    const nameWords = words(icon.name);
    return {
      icon,
      nameWords,
      namePhrase: nameWords.join(" "),
      tags: icon.tags,
      tagWords: new Set(icon.tags.flatMap(words)),
      categoryWords: icon.categories.flatMap(words),
    };
  });
}

function termScore(item: SearchItem, term: string, saved: string[]): number {
  let best = 0;
  if (item.nameWords.includes(term)) best = 60;
  else if (item.nameWords.some((word) => word.startsWith(term))) best = 40;
  else if (item.namePhrase.includes(term)) best = 20;
  if (best < 50 && saved.some((phrase) => phrase.split(" ").includes(term))) best = 50;
  if (best < 35 && item.tags.includes(term)) best = 35;
  if (best < 30 && item.tagWords.has(term)) best = 30;
  if (best < 15) {
    for (const word of item.tagWords) {
      if (word.startsWith(term)) {
        best = 15;
        break;
      }
    }
  }
  if (best < 10 && item.categoryWords.includes(term)) best = 10;
  if (best < 5 && item.tags.some((tag) => tag.includes(term))) best = 5;
  return best;
}

/** A name that is the query plus a variant number, like "ticket-01" for "ticket". */
function isNumberedVariant(nameWords: string[], terms: string[]): boolean {
  const extra = nameWords.slice(terms.length);
  return (
    extra.length > 0 &&
    extra.every((word) => /^\d+$/.test(word)) &&
    terms.every((term, index) => nameWords[index] === term)
  );
}

function byScore(a: { item: SearchItem; score: number }, b: { item: SearchItem; score: number }): number {
  return (
    b.score - a.score ||
    a.item.icon.name.length - b.item.icon.name.length ||
    a.item.icon.name.localeCompare(b.item.icon.name)
  );
}

/** Icons matching every query word, best first. Words match names, tags, categories, and saved keywords. */
export function keywordSearch(items: SearchItem[], query: string, saved: SavedKeywords = {}): IconEntry[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const phrase = terms.join(" ");
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    const itemSaved = saved[item.icon.name] ?? [];
    let score = 0;
    for (const term of terms) {
      const termHit = termScore(item, term, itemSaved);
      if (!termHit) {
        score = 0;
        break;
      }
      score += termHit;
    }
    if (!score) continue;
    if (item.namePhrase === phrase) score += 1000;
    else if (isNumberedVariant(item.nameWords, terms)) score += 900;
    if (itemSaved.includes(phrase)) score += 500;
    if (terms.length > 1 && item.tags.includes(phrase)) score += 100;
    scored.push({ item, score });
  }
  return scored.sort(byScore).map(({ item }) => item.icon);
}

function keywordStrength(item: SearchItem, keyword: string): number {
  const terms = queryTerms(keyword);
  if (!terms.length) return 0;
  const phrase = terms.join(" ");
  if (item.namePhrase === phrase || item.tags.includes(phrase)) return 3;
  if (terms.every((term) => item.nameWords.includes(term))) return 2.5;
  if (terms.every((term) => item.tagWords.has(term))) return 2;
  const prefix = (term: string) =>
    item.nameWords.some((word) => word.startsWith(term)) || [...item.tagWords].some((word) => word.startsWith(term));
  return terms.every((term) => term.length >= PREFIX_MIN_LETTERS && prefix(term)) ? 1 : 0;
}

/** A keyword matches the start of a longer word only from this length, so "joy" doesn't find joystick. */
const PREFIX_MIN_LETTERS = 4;

/**
 * AI Results keep only icons scoring at least this share of the best match. An icon that answers just one
 * loose keyword ("positive" for a plus sign, "emoji" for an angry face) falls below it when others answer several.
 */
export const AI_RELEVANCE = 0.25;

/**
 * Ranks icons against AI-suggested keywords: the more keywords an icon answers, and the earlier those
 * keywords came in the AI's list, the higher it ranks. Icons far below the best match are left out (AI_RELEVANCE).
 */
export function aiRank(items: SearchItem[], keywords: string[], limit = 48): IconEntry[] {
  if (!keywords.length) return [];
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    let score = 0;
    keywords.forEach((keyword, index) => {
      const strength = keywordStrength(item, keyword);
      if (strength) score += strength * (1 + (keywords.length - index) / keywords.length);
    });
    if (score) scored.push({ item, score });
  }
  const best = Math.max(0, ...scored.map(({ score }) => score));
  return scored
    .filter(({ score }) => score >= best * AI_RELEVANCE)
    .sort(byScore)
    .slice(0, limit)
    .map(({ item }) => item.icon);
}
