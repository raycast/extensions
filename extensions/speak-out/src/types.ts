/**
 * Type definitions for the Speak out extension.
 * @module types
 */

// ============================================================================
// Free Dictionary API Response Types
// @see https://dictionaryapi.dev/
// ============================================================================

/** Phonetic pronunciation data from the dictionary API */
export interface Phonetic {
  /** IPA text representation (e.g., "/rɪˈzuːm/") */
  text?: string;
  /** URL to MP3 audio file */
  audio?: string;
  sourceUrl?: string;
  license?: {
    name: string;
    url: string;
  };
}

/** Word definition with examples and related words */
export interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

/** Word meaning grouped by part of speech */
export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

/** Complete dictionary entry for a word */
export interface DictionaryEntry {
  word: string;
  /** Primary IPA pronunciation */
  phonetic?: string;
  /** All available phonetic pronunciations */
  phonetics: Phonetic[];
  origin?: string;
  meanings: Meaning[];
  license?: {
    name: string;
    url: string;
  };
  sourceUrls?: string[];
}

// ============================================================================
// Application Types
// ============================================================================

/** Search history item stored in LocalStorage */
export interface HistoryItem {
  word: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

/** Processed pronunciation result displayed in the UI */
export interface PronunciationResult {
  word: string;
  /** IPA transcription */
  ipa: string;
  /** URL to pronunciation audio (MP3) */
  audioUrl?: string;
  /** Part of speech (noun, verb, etc.) */
  partOfSpeech?: string;
  /** Brief definition */
  definition?: string;
}
