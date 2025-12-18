// API Response types from Free Dictionary API

export interface Phonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: {
    name: string;
    url: string;
  };
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  origin?: string;
  meanings: Meaning[];
  license?: {
    name: string;
    url: string;
  };
  sourceUrls?: string[];
}

// App-specific types

export interface HistoryItem {
  word: string;
  timestamp: number;
}

export interface PronunciationResult {
  word: string;
  ipa: string;
  audioUrl?: string;
  partOfSpeech?: string;
  definition?: string;
}
