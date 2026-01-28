export interface SearchBrandKeyword {
  claimed: boolean;
  name: string | null;
  domain: string;
  icon: string;
  brandId: string | null;
}

export interface RetrieveBrandResponse {
  name: string;
  domain: string;
  claimed: boolean;
  description: string;
  links: Link[];
  logos: Logo[];
  colors: Color[];
  fonts: Font[];
  images: Image[];
  message?: string;
}

export interface Color {
  hex: string;
  type: string;
  brightness: number;
}

export interface Font {
  name: string;
  type: string;
  origin: string;
  originId: null;
  weights: unknown[];
}

export interface Image {
  type: string;
  formats: FormatElement[];
}

export interface FormatElement {
  src: string;
  background: Background | null;
  format: string;
  height?: number;
  width?: number;
  size: number;
}

export enum Background {
  Transparent = "transparent",
}

export enum FormatEnum {
  JPEG = "jpeg",
  PNG = "png",
  SVG = "svg",
}

export interface Link {
  name: string;
  url: string;
}

export interface Logo {
  type: string;
  theme: null | string;
  formats: FormatElement[];
}
