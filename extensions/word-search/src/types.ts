export interface Word {
  word: string;
  score: number;
  defs: string[];
}

export enum SearchType {
  ADJECTIVE = "rel_jjb",
  ANTONYM = "rel_ant",
  MISSING_LETTERS = "sp",
  RHYME = "rel_rhy",
  SYNONYM = "ml",
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
