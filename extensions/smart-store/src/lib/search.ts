import { StoreExtension } from "./catalog";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "raycast",
  "extension",
  "extensions",
  "app",
]);

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

interface IndexedExtension {
  item: StoreExtension;
  title: string;
  name: string;
  commands: string;
  description: string;
  commandDescriptions: string;
  categories: string;
  titleWords: string[];
  commandWords: string[];
  descriptionWords: string[];
}

const indexCache = new WeakMap<StoreExtension[], IndexedExtension[]>();

function getIndex(items: StoreExtension[]): IndexedExtension[] {
  const cached = indexCache.get(items);
  if (cached) return cached;
  const index = items.map((item) => {
    const commands = item.commands.map((c) => [c.title, c.subtitle ?? "", ...c.keywords].join(" ")).join(" ");
    const commandDescriptions = item.commands.map((c) => c.description).join(" ");
    return {
      item,
      title: ` ${normalize(item.title)} `,
      name: ` ${normalize(item.name)} `,
      commands: ` ${normalize(commands)} `,
      description: ` ${normalize(item.description)} `,
      commandDescriptions: ` ${normalize(commandDescriptions)} `,
      categories: ` ${normalize(item.categories.join(" "))} `,
      titleWords: words(`${item.title} ${item.name}`),
      commandWords: words(commands),
      descriptionWords: words(`${item.description} ${commandDescriptions}`),
    };
  });
  indexCache.set(items, index);
  return index;
}

function wordHit(candidates: string[], word: string): boolean {
  return candidates.some(
    (c) => c === word || (word.length >= 4 && c.startsWith(word)) || (c.length >= 4 && word.startsWith(c)),
  );
}

export interface ScoredExtension {
  item: StoreExtension;
  score: number;
}

/**
 * Scores every extension against a list of search terms (words or phrases).
 * Titles and command names weigh more than descriptions, and popular extensions win ties.
 */
export function keywordSearch(items: StoreExtension[], terms: string[], limit = 50): ScoredExtension[] {
  const phrases = [...new Set(terms.map(normalize).filter((t) => t.includes(" ")))];
  const queryWords = [...new Set(terms.flatMap(words))];
  if (!queryWords.length) return [];

  const results: ScoredExtension[] = [];
  for (const doc of getIndex(items)) {
    let score = 0;
    let matched = 0;
    for (const word of queryWords) {
      let wordScore = 0;
      if (wordHit(doc.titleWords, word)) wordScore += 3;
      if (wordHit(doc.commandWords, word)) wordScore += 2;
      if (wordHit(doc.descriptionWords, word)) wordScore += 1.5;
      if (doc.categories.includes(` ${word} `)) wordScore += 0.5;
      if (wordScore > 0) matched++;
      score += wordScore;
    }
    for (const phrase of phrases) {
      const padded = ` ${phrase} `;
      if (doc.title.includes(padded) || doc.name.includes(padded)) score += 8;
      if (doc.commands.includes(padded)) score += 5;
      if (doc.description.includes(padded) || doc.commandDescriptions.includes(padded)) score += 4;
    }
    if (score <= 0) continue;
    const coverage = matched / queryWords.length;
    score = score * (0.4 + coverage) + Math.log10(doc.item.downloads + 1) * 0.4;
    results.push({ item: doc.item, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type BrowseFilter = "popular" | "new" | "updated" | "installed" | `category:${string}`;

export function browse(items: StoreExtension[], filter: BrowseFilter, installed: Set<string>): StoreExtension[] {
  let list = items;
  if (filter === "installed") list = items.filter((item) => installed.has(item.id));
  if (filter.startsWith("category:")) {
    const category = filter.slice("category:".length);
    list = items.filter((item) => item.categories.includes(category));
  }
  const sorted = [...list];
  if (filter === "new") sorted.sort((a, b) => b.createdAt - a.createdAt);
  else if (filter === "updated") sorted.sort((a, b) => b.updatedAt - a.updatedAt);
  else sorted.sort((a, b) => b.downloads - a.downloads);
  return sorted.slice(0, 150);
}

export function allCategories(items: StoreExtension[]): string[] {
  return [...new Set(items.flatMap((item) => item.categories))].sort((a, b) => a.localeCompare(b));
}
