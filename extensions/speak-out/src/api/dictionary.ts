/**
 * Free Dictionary API client for word pronunciation lookups.
 * @module api/dictionary
 * @see https://dictionaryapi.dev/
 */

import { DictionaryEntry, PronunciationResult } from "../types";

const API_BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

/**
 * Looks up pronunciation data for an English word.
 *
 * @param word - The word to look up
 * @returns Array of pronunciation results with IPA and audio URLs
 * @throws Error if word not found (404) or API error
 *
 * @example
 * const results = await lookupWord("resume");
 * // Returns: [{ word: "resume", ipa: "/rɪˈzuːm/", audioUrl: "...", ... }]
 */
export async function lookupWord(word: string): Promise<PronunciationResult[]> {
  const response = await fetch(
    `${API_BASE_URL}/${encodeURIComponent(word.trim().toLowerCase())}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Word "${word}" not found in dictionary`);
    }
    throw new Error(`API error: ${response.status}`);
  }

  const data = (await response.json()) as DictionaryEntry[];
  return parseResults(data);
}

/**
 * Parses raw API response into structured pronunciation results.
 *
 * Strategy:
 * 1. Extract phonetics that have audio files (preferred)
 * 2. Fall back to phonetics with IPA text only
 * 3. Deduplicate results by audio URL or IPA to avoid showing duplicates
 *
 * @param entries - Raw dictionary entries from API
 * @returns Deduplicated pronunciation results
 */
function parseResults(entries: DictionaryEntry[]): PronunciationResult[] {
  const results: PronunciationResult[] = [];

  for (const entry of entries) {
    const phoneticsWithAudio = entry.phonetics.filter(
      (p) => p.audio && p.audio.length > 0,
    );
    const mainIpa =
      entry.phonetic || entry.phonetics.find((p) => p.text)?.text || "";

    if (phoneticsWithAudio.length > 0) {
      // Create result for each phonetic with audio
      for (const phonetic of phoneticsWithAudio) {
        const meaning = entry.meanings[0];
        results.push({
          word: entry.word,
          ipa: phonetic.text || mainIpa,
          audioUrl: phonetic.audio,
          partOfSpeech: meaning?.partOfSpeech,
          definition: meaning?.definitions[0]?.definition,
        });
      }
    } else {
      // No audio available - show IPA only
      const meaning = entry.meanings[0];
      results.push({
        word: entry.word,
        ipa: mainIpa,
        partOfSpeech: meaning?.partOfSpeech,
        definition: meaning?.definitions[0]?.definition,
      });
    }
  }

  return deduplicateResults(results);
}

/**
 * Removes duplicate results based on audio URL, IPA, or word.
 */
function deduplicateResults(
  results: PronunciationResult[],
): PronunciationResult[] {
  const seen = new Set<string>();

  return results.filter((r) => {
    const key = r.audioUrl || r.ipa || r.word;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
