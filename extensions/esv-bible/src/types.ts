export interface Preferences {
  ESVApiToken: string;
  includePassageReferences: boolean;
  includeVerseNumbers: boolean;
  includeFirstVerseNumbers: boolean;
  includeSelahs: boolean;
  includeFootnotes: boolean;
  includeHeadings: boolean;
  indentParagraphs: boolean;
  indentPoetry: boolean;
  includeCopyright: string;
  indentUsing: "spaces" | "tabs";
}

export interface PassageResponse {
  query: string;
  canonical: string;
  parsed: [number[]];
  passage_meta: [
    {
      canonical: string;
      chapter_start: number[];
      chapter_end: number[];
      prev_verse: number;
      next_verse: number;
      prev_chapter: number[];
      next_chapter: number[];
    }
  ];
  passages: string[];
}

interface searchResponseObj {
  reference: string;
  content: string;
}

export interface SearchResponse {
  page: number;
  total_results: number;
  results: searchResponseObj[];
  total_pages: number;
}

export interface Search {
  id: string;
  q: string;
  refs: string;
  results: string;
}

export interface Passage {
  id: string;
  ref: string;
  passage: {
    styled: string;
    plain: string;
  };
}
