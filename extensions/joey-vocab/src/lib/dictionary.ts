import { supabase } from "./supabase";
import type { DictionaryEntry } from "../types";

/**
 * Normalizes a word by trimming and converting to lowercase.
 */
function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Splits a normalized query into tokens for ordered-contains matching.
 */
function tokenizeSearchQuery(query: string): string[] {
  return normalizeWord(query)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Builds a SQL LIKE pattern from a search query.
 * Tokens are joined with % for ordered contains match: %token1%token2%
 */
function createSqlLikePattern(query: string): string {
  const tokens = tokenizeSearchQuery(query);
  return `%${tokens.join("%")}%`;
}

/**
 * Returns true when every required dictionary column contains data.
 * Prevents partially populated cards from appearing in search results.
 */
function isDictionaryEntryComplete(entry: DictionaryEntry): boolean {
  const hasWordContent =
    Boolean(entry.id) &&
    Boolean(entry.word?.trim()) &&
    Boolean(entry.definition?.trim()) &&
    Boolean(entry.example_sentence?.trim());

  const hasAssets =
    entry.image_path !== null &&
    entry.word_audio_path !== null &&
    entry.definition_audio_path !== null &&
    entry.sentence_audio_path !== null;

  const hasEnoughDistractors =
    entry.word_distractors !== null &&
    entry.word_distractors.length >= 3 &&
    entry.definition_distractors !== null &&
    entry.definition_distractors.length >= 3;

  return hasWordContent && hasAssets && hasEnoughDistractors;
}

/**
 * Searches dictionary entries by contains-match (ilike).
 * Tokenizes the query and builds a %token1%token2% pattern for ordered matching.
 *
 * @param searchQuery - The search query
 * @returns Filtered, complete dictionary entries
 * @throws {Error} When search query is empty or database query fails
 */
export async function searchDictionary(searchQuery: string): Promise<DictionaryEntry[]> {
  const normalizedWord = normalizeWord(searchQuery);

  if (!normalizedWord) {
    return [];
  }

  const likePattern = createSqlLikePattern(normalizedWord);

  const { data: entries, error } = await supabase
    .from("dictionary")
    .select("*")
    .ilike("word", likePattern)
    .order("word", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Failed to search dictionary: ${error.message}`);
  }

  return ((entries as DictionaryEntry[]) || []).filter(isDictionaryEntryComplete);
}
