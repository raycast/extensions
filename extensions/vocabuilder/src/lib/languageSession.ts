import { LocalStorage } from "@raycast/api";
import {
  getLanguageByCode,
  LANGUAGES,
  Language,
  LanguagePair,
  storageKeyPrefix,
  swapLanguagePair as swapPairLanguages,
} from "./languages";

const ACTIVE_LANGUAGE_PAIR_KEY = "vocabuilder-active-language-pair";
const RECENT_LANGUAGE_PAIRS_KEY = "vocabuilder-recent-language-pairs";
const MAX_RECENT_LANGUAGE_PAIRS = 8;

export interface LanguagePairChoice {
  pair: LanguagePair;
  value: string;
  title: string;
  isDefault: boolean;
  isRecent: boolean;
  keywords: string[];
}

export function languagePairValue(pair: LanguagePair): string {
  return storageKeyPrefix(pair);
}

export function languagePairTitle(pair: LanguagePair): string {
  return `${pair.source.name} → ${pair.target.name}`;
}

export function parseLanguagePairValue(value: string): LanguagePair | null {
  // Pair values use this app's simple language codes. If locale-style codes
  // such as "pt-BR" are added later, update this serialization first.
  const [sourceCode, targetCode, extra] = value.split("-");
  if (!sourceCode || !targetCode || extra || sourceCode === targetCode) return null;

  const source = getLanguageByCode(sourceCode);
  const target = getLanguageByCode(targetCode);
  if (!source || !target) return null;

  return { source, target };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeLanguageQuery(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

function languageAliases(language: Language): string[] {
  const aliases = [language.code, language.name];
  if (language.code === "uk") {
    aliases.push("ua");
  }

  return unique(aliases.map(normalizeLanguageQuery));
}

function languageMatchScore(language: Language, query: string): number | null {
  const aliases = languageAliases(language);
  const name = normalizeLanguageQuery(language.name);

  if (aliases.includes(query)) return 0;
  if (name.startsWith(query)) return 1;
  if (aliases.some((alias) => alias.startsWith(query))) return 2;
  if (name.includes(query)) return 3;

  return null;
}

function findLanguageMatches(query: string): Language[] {
  const normalized = normalizeLanguageQuery(query);
  if (!normalized) return [];

  return LANGUAGES.map((language) => ({ language, score: languageMatchScore(language, normalized) }))
    .filter((match): match is { language: Language; score: number } => match.score !== null)
    .sort((a, b) => a.score - b.score || a.language.name.localeCompare(b.language.name))
    .map(({ language }) => language);
}

function splitPairSearch(query: string): [string, string] | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const separatorMatch = trimmed.match(/^(.*?)\s*(?:->|→|[-–—/])\s*(.*?)$/u);
  if (separatorMatch) return [separatorMatch[1], separatorMatch[2]];

  const whitespaceParts = trimmed.split(/\s+/u).filter(Boolean);
  if (
    whitespaceParts.length === 2 &&
    findLanguageMatches(whitespaceParts[0])[0] &&
    findLanguageMatches(whitespaceParts[1])[0]
  ) {
    return [whitespaceParts[0], whitespaceParts[1]];
  }

  return null;
}

function makeLanguagePair(source: Language, target: Language): LanguagePair | null {
  if (source.code === target.code) return null;
  return { source, target };
}

function choiceForPair(pair: LanguagePair, defaultPair: LanguagePair, recentValues: Set<string>): LanguagePairChoice {
  const sourceAliases = languageAliases(pair.source);
  const targetAliases = languageAliases(pair.target);

  return {
    pair,
    value: languagePairValue(pair),
    title: languagePairTitle(pair),
    isDefault: languagePairValue(pair) === languagePairValue(defaultPair),
    isRecent: recentValues.has(languagePairValue(pair)),
    keywords: unique([
      ...sourceAliases,
      ...targetAliases,
      pair.source.name,
      pair.target.name,
      `${pair.source.code}-${pair.target.code}`,
      `${pair.source.code}${pair.target.code}`,
      `${pair.source.name} ${pair.target.name}`,
      `${pair.source.name}-${pair.target.name}`,
    ]),
  };
}

function choicesFromPairs(
  pairs: LanguagePair[],
  defaultPair: LanguagePair,
  recentValues: Set<string> = new Set(),
): LanguagePairChoice[] {
  const byValue = new Map<string, LanguagePair>();
  for (const pair of pairs) {
    byValue.set(languagePairValue(pair), pair);
  }

  return [...byValue.values()].map((pair) => choiceForPair(pair, defaultPair, recentValues));
}

function parseStoredRecentPairs(raw: string | undefined): string[] | null {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return null;
  }
}

async function getRecentLanguagePairValues(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(RECENT_LANGUAGE_PAIRS_KEY);
  const stored = parseStoredRecentPairs(raw);
  if (!stored) {
    await LocalStorage.removeItem(RECENT_LANGUAGE_PAIRS_KEY);
    return [];
  }

  const values = unique(stored).filter((value) => parseLanguagePairValue(value) !== null);
  if (values.length !== stored.length) {
    await LocalStorage.setItem(RECENT_LANGUAGE_PAIRS_KEY, JSON.stringify(values));
  }

  return values;
}

async function touchRecentLanguagePair(pair: LanguagePair): Promise<void> {
  const value = languagePairValue(pair);
  const current = await getRecentLanguagePairValues();
  const updated = [value, ...current.filter((existing) => existing !== value)].slice(0, MAX_RECENT_LANGUAGE_PAIRS);
  await LocalStorage.setItem(RECENT_LANGUAGE_PAIRS_KEY, JSON.stringify(updated));
}

export async function getRecentLanguagePairChoices(
  defaultPair: LanguagePair,
  activePair?: LanguagePair,
): Promise<LanguagePairChoice[]> {
  const storedValues = await getRecentLanguagePairValues();
  const storedPairs = storedValues.flatMap((value) => {
    const pair = parseLanguagePairValue(value);
    return pair ? [pair] : [];
  });
  const activeValue = activePair ? languagePairValue(activePair) : null;
  const pairs = activePair
    ? [activePair, ...storedPairs.filter((pair) => languagePairValue(pair) !== activeValue)]
    : storedPairs.length > 0
      ? storedPairs
      : [defaultPair];
  return choicesFromPairs(pairs, defaultPair, new Set(storedValues));
}

export function getSearchLanguagePairChoices(searchText: string, defaultPair: LanguagePair): LanguagePairChoice[] {
  const query = searchText.trim();
  if (!query) return [];

  const pairSearch = splitPairSearch(query);
  if (pairSearch) {
    const [sourceQuery, targetQuery] = pairSearch;
    const sourceMatches = sourceQuery.trim() ? findLanguageMatches(sourceQuery).slice(0, 5) : LANGUAGES;
    const targetMatches = targetQuery.trim() ? findLanguageMatches(targetQuery).slice(0, 5) : LANGUAGES;
    const pairs = sourceMatches.flatMap((source) =>
      targetMatches.flatMap((target) => {
        const pair = makeLanguagePair(source, target);
        return pair ? [pair] : [];
      }),
    );
    return choicesFromPairs(pairs, defaultPair);
  }

  const pairs = findLanguageMatches(query)
    .slice(0, 12)
    .flatMap((language) => [
      ...LANGUAGES.flatMap((target) => {
        const pair = makeLanguagePair(language, target);
        return pair ? [pair] : [];
      }),
      ...LANGUAGES.flatMap((source) => {
        const pair = makeLanguagePair(source, language);
        return pair ? [pair] : [];
      }),
    ]);

  return choicesFromPairs(pairs, defaultPair);
}

export async function getActiveLanguagePair(defaultPair: LanguagePair): Promise<LanguagePair> {
  const stored = await LocalStorage.getItem<string>(ACTIVE_LANGUAGE_PAIR_KEY);
  if (!stored) return defaultPair;

  const pair = parseLanguagePairValue(stored);
  if (pair) return pair;

  await LocalStorage.removeItem(ACTIVE_LANGUAGE_PAIR_KEY);
  return defaultPair;
}

export async function setActiveLanguagePair(pair: LanguagePair): Promise<void> {
  await LocalStorage.setItem(ACTIVE_LANGUAGE_PAIR_KEY, languagePairValue(pair));
  await touchRecentLanguagePair(pair);
}

export async function setActiveLanguagePairValue(value: string): Promise<LanguagePair | null> {
  const pair = parseLanguagePairValue(value);
  if (!pair) return null;
  await setActiveLanguagePair(pair);
  return pair;
}

export function swapLanguagePair(pair: LanguagePair): LanguagePair {
  return swapPairLanguages(pair);
}
