/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

export interface AIDictionaryExample {
  sentence: string;
  translation?: string;
}

export interface AIDictionarySense {
  partOfSpeech?: string;
  meanings: string[];
  definition?: string;
  examples: AIDictionaryExample[];
}

export interface AIDictionaryForm {
  label: string;
  value: string;
}

export interface AIDictionaryEntry {
  headword: string;
  pronunciation?: string;
  senses: AIDictionarySense[];
  forms: AIDictionaryForm[];
}

export interface AIWordResult {
  translation: string;
  entry: AIDictionaryEntry | null;
}
