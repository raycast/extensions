export interface ReferenceSearchResult {
  url: URL;
  passages: BiblePassage[];
  version: string;
  copyright: string;
}

export interface BiblePassage {
  verses: Verse[];
  reference: string;
}

export interface Verse {
  chapter: number;
  verse: number;
  text: string;
}
