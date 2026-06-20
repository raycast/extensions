export type PhoneticVariant = {
  region: "US" | "UK" | "Other";
  text?: string;
  audioUrl?: string;
};

export type Definition = {
  partOfSpeech: string;
  english: string;
  example?: string;
};

export type Inflections = {
  base: string;
  past?: string;
  pastParticiple?: string;
  presentParticiple?: string;
  plural?: string;
};

export type TechEntry = {
  term: string;
  domains: string[];
  meaning: string;
  explanation: string;
  commonCauses?: string[];
  solutions?: string[];
  commands?: string[];
  examples?: string[];
};

export type WordResult = {
  query: string;
  word: string;
  syllables?: string;
  pronunciationHint?: string;
  phonetics: PhoneticVariant[];
  localDefinitions: string[];
  definitions: Definition[];
  examples: Definition[];
  inflections: Inflections;
  collocations: string[];
  synonyms: string[];
  techEntry?: TechEntry;
  source: "remote" | "cache" | "local";
  updatedAt: string;
};

export type Favorite = {
  word: string;
  createdAt: string;
};

export type HistoryItem = {
  word: string;
  queryTime: string;
};

export type StudyStats = {
  today: number;
  week: number;
  total: number;
};
