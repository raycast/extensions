export type SourceId = "7tv" | "bttv" | "ffz";

export type Variant = {
  url: string;
  height: number;
  mime: string;
};

export type Emote = {
  key: string;
  name: string;
  source: SourceId;
  animated: boolean;
  nsfw: boolean;
  preview: string;
  variants: Variant[];
};

export type SearchArgs = {
  query: string;
  animatedOnly: boolean;
};

export type Source = {
  id: SourceId;
  title: string;
  minQueryLength: number;
  search(args: SearchArgs, signal?: AbortSignal): Promise<Emote[]>;
};

export const EMOJI_HEIGHT = 32;
export const STICKER_HEIGHT = 128;
