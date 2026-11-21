export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'idiom'
  | 'other';

export interface DefinitionItem {
  partOfSpeech: PartOfSpeech;
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface MeaningGroup {
  partOfSpeech: PartOfSpeech;
  definitions: string[];
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

export interface WordResult {
  word: string;
  phonetic?: string;
  syllables?: number;
  meanings: MeaningGroup[];
  allSynonyms: string[];
  allAntonyms: string[];
  source: 'offline' | 'online' | 'oxford' | 'cache';
  originalSource?: 'offline' | 'online' | 'oxford';
}

export interface SynonymItem {
  word: string;
  score?: number;
  partOfSpeech?: PartOfSpeech;
  relationType: 'synonym' | 'antonym' | 'related';
}

export interface ThesaurusResult {
  targetWord: string;
  synonyms: SynonymItem[];
  antonyms: SynonymItem[];
  source: 'offline' | 'online' | 'cache';
}

export interface ExtensionPreferences {
  offlineOnly?: boolean;
  preferOxford?: boolean;
}

export interface WordSuggestion {
  word: string;
  type: 'prefix' | 'spellcheck';
  partOfSpeech?: PartOfSpeech;
  shortDefinition?: string;
  score?: number;
}

export interface ReverseSearchResult {
  word: string;
  score?: number;
  partOfSpeech?: PartOfSpeech;
  definition?: string;
  source: 'online' | 'offline' | 'wordnet';
}

export interface VectorSearchResult {
  word: string;
  similarity: number; // 0.0 to 1.0 (e.g. 0.98 = 98%)
  matchPercent: number; // 0 to 100
  score?: number;
  rawScore?: number;
  rawCosine?: number;
  partOfSpeech?: PartOfSpeech;
  definition?: string;
  source: 'online' | 'offline' | 'hybrid';
  closestSeeds?: string[];
}


