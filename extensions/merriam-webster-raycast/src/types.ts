export type SuggestionResult = {
  kind: "suggestion";
  value: string;
};

export type EntryResult = {
  kind: "entry";
  id: string;
  headword: string;
  partOfSpeech?: string;
  pronunciation?: string;
  audioUrl?: string;
  shortDefinitions: string[];
  examples: string[];
};

export type SearchResult = EntryResult | SuggestionResult;
