export interface Arguments {
  word: string;
}

export interface WordExplanation {
  word: string;
  pronunciation: string;
  definition: string;
  chinese: string;
  example_en: string;
  example_zh: string;
  tip: string;
  raw_output: string;
  timestamp?: string;
}
