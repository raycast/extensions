export interface Word {
  word: string;
  score: number;
  defs: string[];
}

export enum SearchType {
  SYNONYM = "syn",
  ANTONYM = "ant",
  RHYME = "rhy",
}

export interface Definition {
  definition: string;
  type: string;
}

export enum WordType {
  "n" = "noun",
  "v" = "verb",
  "adj" = "adjective",
}
