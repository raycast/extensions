// vendored from https://github.com/leodr/generate-emoji-list
export type EmojiList<T extends Emoji> = Array<EmojiCategory<T>>;

export interface EmojiCategory<T extends Emoji> {
  category: string;
  emojis: T[];
}

export interface Emoji {
  emoji: string;
  description: string;
  modifiers: EmojiModifier[];
  shortCode?: string[];
}

export interface EmojiWithShortCodes extends Emoji {
  shortCode: string[];
}

export type EmojiModifier = "skin-tone";
