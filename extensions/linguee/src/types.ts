export interface ResultItem {
  word: string;
  wordType: string;
  lid: string;
  href: string;
  translations: Array<Translation>;
}

export interface Translation {
  word: string;
  wordType: string;
  lid: string;
}
