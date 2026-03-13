export type Icon = {
  categories: string;
  codepoint: string;
  name: string;
  version: number;
  tags: string[];
  assets: IconAsset[];
};

export type IconAsset = {
  family: string;
  url: string;
};

export enum MaterialIconStyle {
  Filled,
  Outlined,
  Rounded,
  Sharp,
  "Two Tone",
}
