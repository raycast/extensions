import { UUID } from "crypto";

export type Corpus = {
  id: UUID;
  folder: string;
  title: string;
};

export type CorpusInput = {
  id: UUID;
  folder: string[];
  title: string;
};
