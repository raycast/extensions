/**
 * TypeScript interfaces for Duden word data
 * Based on the Python duden project structure
 */

export interface DudenWord {
  /** Word without article (e.g., "Löffel") */
  name: string;
  /** Word with article (e.g., "Löffel, der") */
  title: string;
  /** Unique URL identifier for the word */
  urlname: string;
  /** Article (e.g., "der", "die", "das") */
  article?: string;
  /** Part of speech (e.g., "Substantiv, maskulin") */
  partOfSpeech?: string;
  /** Frequency rating from 1-5 */
  frequency?: number;
  /** Usage context */
  usage?: string;
  /** Word separation/syllables (e.g., ["Löf", "fel"]) */
  wordSeparation?: string[];
  /** Meaning overview - can be string, array, or nested structure */
  meaningOverview?: string | string[] | Record<string, unknown>;
  /** Word origin/etymology */
  origin?: string;
  /** Synonyms as formatted string */
  synonyms?: string;
  /** Pronunciation in IPA notation */
  phonetic?: string;
  /** Alternative spellings */
  alternativeSpellings?: string[];
  /** Usage examples */
  examples?: string;
}

export interface SearchResult {
  /** Word name for display */
  name: string;
  /** URL name for fetching details */
  urlname: string;
  /** Part of speech for preview */
  partOfSpeech?: string;
}
