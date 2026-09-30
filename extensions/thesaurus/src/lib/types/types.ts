export type SingleWord = {
  word: string;
  strength: number;
};

export type Synonym = SingleWord;

export type Antonym = SingleWord;

export type EntryData = {
  asIn: string;
  definition: string;
  synonyms: Synonym[];
  antonyms: Antonym[];
  link: string;
};

export type Entry = {
  pos: string;
  data: EntryData[];
};

type OkResult = {
  status: "OK";
  word: string;
  entries: Entry[];
};

type NotFoundResult = {
  status: "NOT_FOUND";
  suggestions: string[];
};

type ErrorResult = {
  status: "ERROR";
  reason?: string;
};

export type Result = OkResult | NotFoundResult | ErrorResult;
