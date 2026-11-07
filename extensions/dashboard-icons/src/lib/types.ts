export const SOURCES = ["native", "selfhst", "lobehub", "simpleicons"] as const;
export type Source = (typeof SOURCES)[number];

export const FORMATS = ["webp", "png", "svg"] as const;
export type Format = (typeof FORMATS)[number];

export interface SearchResult {
  name: string;
  title: string;
  source: Source;
  previewUrl: string;
  matchedVariant?: string;
}

export interface IconLicense {
  name: string;
  url: string | null;
  attribution: string | null;
  sourceUrl: string | null;
  provider: string;
  providerUrl: string;
}

/** CDN URLs keyed by format, then by variant key ("default", "light", "dark", "wordmark-light", ...). */
export type IconUrls = Partial<Record<Format, Record<string, string>>>;

export interface IconDetails {
  name: string;
  title: string;
  source: Source;
  previewUrl: string;
  pageUrl: string;
  aliases: string[];
  categories: string[];
  author: string | null;
  updatedAt: string | null;
  license: IconLicense | null;
  urls: IconUrls;
}

export interface IconFile {
  /** Variant key as returned by the server, e.g. "default" or "wordmark-dark". */
  variant: string;
  format: Format;
  url: string;
  fileName: string;
}

export interface VariantGroup {
  variant: string;
  label: string;
  hint?: string;
  files: IconFile[];
}
