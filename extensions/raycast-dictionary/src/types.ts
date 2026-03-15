export interface DictionaryEntry {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  provider: string;
  cachedAt: number;
}

export interface Preferences {
  apiKey: string;
}

export interface CacheIndex {
  words: string[];
}
