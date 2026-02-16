export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface LCH {
  l: number;
  c: number;
  h: number;
}

export interface HWB {
  h: number;
  w: number;
  b: number;
}

export interface LUV {
  l: number;
  u: number;
  v: number;
}

export interface Color {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  hsv: HSV;
  cmyk: CMYK;
  lab: LAB;
  oklch: OKLCH;
  xyz: XYZ;
  lch: LCH;
  hwb: HWB;
  luv: LUV;
  name?: string;
  meaning?: string; // Psychology/Meaning
}

export type AlgorithmType =
  | "monochromatic"
  | "analogous"
  | "complementary"
  | "triadic"
  | "split-complementary"
  | "web"
  | "app"
  | "dashboard"
  | "marketing"
  | "custom";

export type ColorBlindnessType = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
}

export interface Palette {
  id: string;
  name: string;
  colors: Color[];
  algorithm: AlgorithmType;
  collectionId?: string;
  createdAt: number;
}
