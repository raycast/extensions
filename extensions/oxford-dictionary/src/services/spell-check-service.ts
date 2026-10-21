import { WordResult, WordSuggestion, ExtensionPreferences } from '../types/dictionary';
import { findPrefixMatchesOffline, spellCheckOffline, lookupOfflineZeroRam } from './fast-wordnet-reader';
import { searchWord } from './dictionary-manager';

const SUGGESTIONS_CACHE = new Map<string, {
  exactMatch: WordResult | null;
  completions: WordSuggestion[];
  spellingSuggestions: WordSuggestion[];
}>();

async function fetchDatamuseCompletions(prefix: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(prefix)}&max=8`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ word: string }>;
    return data.map((d) => d.word.toLowerCase());
  } catch {
    return [];
  }
}

async function fetchDatamuseSpelling(misspelled: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(misspelled)}&max=6`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ word: string }>;
    return data.map((d) => d.word.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * Enriches a suggestion word with part of speech and first definition snippet.
 */
async function enrichSuggestion(word: string, type: 'prefix' | 'spellcheck'): Promise<WordSuggestion> {
  try {
    const offline = await lookupOfflineZeroRam(word);
    if (offline && offline.meanings && offline.meanings.length > 0) {
      const primary = offline.meanings[0];
      return {
        word,
        type,
        partOfSpeech: primary.partOfSpeech,
        shortDefinition: primary.definitions[0] || undefined,
      };
    }
  } catch {
    // fallback
  }

  return {
    word,
    type,
  };
}

export async function getWordSuggestions(
  rawQuery: string,
  preferences?: ExtensionPreferences
): Promise<{
  exactMatch: WordResult | null;
  completions: WordSuggestion[];
  spellingSuggestions: WordSuggestion[];
}> {
  const query = rawQuery.trim().toLowerCase();
  if (!query || query.length < 2) {
    return { exactMatch: null, completions: [], spellingSuggestions: [] };
  }

  const cacheKey = `${query}_${preferences?.offlineOnly ? 'off' : 'on'}`;
  if (SUGGESTIONS_CACHE.has(cacheKey)) {
    return SUGGESTIONS_CACHE.get(cacheKey)!;
  }

  // 1. Look up exact match
  const exactMatch = await searchWord(query, preferences);

  // 2. Fetch completions (as word is being typed)
  const offlineCompletions = findPrefixMatchesOffline(query, 8);
  let onlineCompletions: string[] = [];
  if (!preferences?.offlineOnly) {
    onlineCompletions = await fetchDatamuseCompletions(query);
  }

  // 3. Fetch spelling corrections only if NO exact match exists
  let offlineSpelling: string[] = [];
  let onlineSpelling: string[] = [];
  if (!exactMatch) {
    offlineSpelling = spellCheckOffline(query, 5);
    if (!preferences?.offlineOnly && query.length >= 3) {
      onlineSpelling = await fetchDatamuseSpelling(query);
    }
  }

  const completionSet = new Set<string>();
  const spellingSet = new Set<string>();

  // Collect candidate words from both sources
  const candidateCompletions = [...onlineCompletions, ...offlineCompletions];
  const candidateSpellings = [...onlineSpelling, ...offlineSpelling];

  for (const w of candidateCompletions) {
    const clean = w.toLowerCase().trim();
    if (clean === query) continue;
    if (clean.startsWith(query)) {
      if (completionSet.size < 8) completionSet.add(clean);
    } else if (!exactMatch) {
      if (spellingSet.size < 6) spellingSet.add(clean);
    }
  }

  for (const w of candidateSpellings) {
    const clean = w.toLowerCase().trim();
    if (clean === query || completionSet.has(clean) || spellingSet.has(clean)) continue;
    if (clean.startsWith(query)) {
      if (completionSet.size < 8) completionSet.add(clean);
    } else if (!exactMatch) {
      if (spellingSet.size < 6) spellingSet.add(clean);
    }
  }

  const completions: WordSuggestion[] = await Promise.all(
    Array.from(completionSet).map((w) => enrichSuggestion(w, 'prefix'))
  );

  // Exact matches take full precedence; only suggest spell check if no exact match and not enough completions
  const finalSpellingSet = exactMatch || completionSet.size >= 3 ? [] : Array.from(spellingSet);

  const spellingSuggestions: WordSuggestion[] = await Promise.all(
    finalSpellingSet.map((w) => enrichSuggestion(w, 'spellcheck'))
  );

  const result = { exactMatch, completions, spellingSuggestions };
  if (SUGGESTIONS_CACHE.size > 200) {
    SUGGESTIONS_CACHE.clear();
  }
  SUGGESTIONS_CACHE.set(cacheKey, result);

  return result;
}
