export type Platform = "iOS" | "macOS" | "watchOS" | "tvOS" | "visionOS";

export const PLATFORMS: readonly Platform[] = ["iOS", "macOS", "watchOS", "tvOS", "visionOS"];

export type sfsymbol = {
  name: string;
  /** The private-use glyph that renders as the symbol in SF Pro. */
  symbol: string;
  categories: string[];
  searchTerms: string[];
  /** First OS version per platform where the monochrome symbol exists. */
  availability?: Partial<Record<Platform, string>>;
  /** Unicode code point of the glyph, such as "U+10048B". Absent for the bundled snapshot. */
  codepoint?: string;
  /** Apple's usage restriction, such as "This symbol may not be modified…". Absent for unrestricted symbols. */
  restriction?: string;
  /** Rendering mode (monochrome, hierarchical, palette, multicolor) → platform → first OS version. */
  renderingModes?: Record<string, Record<string, string>>;
};

export type category = {
  name: string;
  title: string;
  symbol: string;
};

export type Catalog = {
  /** "app" when read from the installed SF Symbols app, "bundled" for the fallback snapshot. */
  source: "app" | "bundled";
  /** Identifies the data this catalog was built from; tile caches are keyed by it. */
  key: string;
  symbols: sfsymbol[];
  categories: category[];
  /** Family base name → its variants, from Apple's own map. Empty for the bundled snapshot. */
  families: Record<string, string[]>;
};

export type CatalogIndex = Catalog & {
  byName: Map<string, sfsymbol>;
  /** Variant name → family base name. Bases map to themselves. */
  familyOf: Map<string, string>;
};

export interface SymbolProps {
  symbol: sfsymbol;
  refresh: () => void;
  pinned?: boolean;
  recent?: boolean;
}
