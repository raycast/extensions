export interface EmojiMetadata {
  e: string;
  a: string;
  k: string[];
  c: string;
  o: number;
}

export interface EmojiWithUnicode extends EmojiMetadata {
  unicode: string;
}

export type Combinations = Record<string, string>;
