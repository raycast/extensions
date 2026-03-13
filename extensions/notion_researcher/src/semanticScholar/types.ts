export type Author = {
  authorId: string;
  name: string;
};

export type Journal = {
  volume: string;
  name: string;
};

export type CitedPaper = {
  paperId: string;
  url: string;
  title: string;
  abstract: string;
  citationCount: number;
  openAccessPdf: null | { url: string; status?: string };
  publicationDate: string;
  journal: Journal;
  authors: Author[];
};

export type DataItem = {
  contexts: string[];
  intents: string[];
  isInfluential: boolean;
  citedPaper: CitedPaper;
};

export type SemanticScholarResponseType = {
  offset: number;
  next: number;
  data: DataItem[];
};
