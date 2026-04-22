export type SuggestionResult = {
  kind: "suggestion";
  value: string;
};

export type DefinitionPart = {
  text: string;
  examples: string[];
};

export type Sense = {
  number: string;
  label?: string;
  parts: DefinitionPart[];
};

export type EntryResult = {
  kind: "entry";
  id: string;
  headword: string;
  partOfSpeech?: string;
  pronunciation?: string;
  audioUrl?: string;
  senses: Sense[];
};

export type SearchResult = EntryResult | SuggestionResult;
