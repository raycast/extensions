export type PaletteKind =
  | "similar"
  | "analogous"
  | "complementary"
  | "splitComplementary"
  | "triadic"
  | "tetradic"
  | "temperatureContrast"
  | "light"
  | "dark"
  | "muted"
  | "neutral"
  | "secondary"
  | "accent";

export type HslColor = {
  h: number;
  s: number;
  l: number;
};

export type ColorReference = {
  number: string;
  name: string;
  hex: string;
};

export type TraditionalColor = {
  number: string;
  name: string;
  pinyin: string;
  pinyinCompact: string;
  hex: string;
  hsl: HslColor;
  hueCategory: string;
  temperature: string;
  palettes: Record<PaletteKind, ColorReference[]>;
  main: ColorReference;
  secondary: ColorReference[];
  accent: ColorReference[];
  schemeText: string;
};
