export type SimpleWord = {
  word: string;
  score: number;
};

export type Word = SimpleWord & {
  defs?: string[];
  tags?: string[];
};

export enum SearchType {
  ADJECTIVE = "rel_jjb",
  ANTONYM = "rel_ant",
  MISSING_LETTERS = "sp",
  RHYME = "rel_rhy",
  SYNONYM = "ml",
  SOUND_LIKE = "sl",
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

export enum Vocabulary {
  English = "en",
  Spanish = "es",
  Wikipedia = "enwiki",
}
