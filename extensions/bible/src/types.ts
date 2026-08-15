export interface ReferenceSearchResult {
  url?: URL;
  passages: BiblePassage[];
  version: string;
  copyright: string;
}

export interface BiblePassage {
  verses: Verse[] | string;
  reference: string;
}

export interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

export interface FormattingOptions {
  includeVerseNumbers?: boolean;
  includeCopyright?: boolean;
  includeReferences?: boolean;
  oneVersePerLine?: boolean;
}
