export interface MozPlacesRow {
  readonly url: string;
  readonly title: string | null;
  readonly frecency: number;
  readonly visit_count: number;
}

export interface FirefoxProfile {
  readonly name: string;
  readonly path: string;
  readonly placesDbPath: string;
  readonly isDefault: boolean;
}

export type OpenTargetKind = "history" | "url" | "search";

export interface OpenTarget {
  readonly kind: OpenTargetKind;
  readonly url: string;
}

export interface Suggestion {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly frecency: number;
  readonly visitCount: number;
}

export interface CanonicalUrl {
  readonly url: string;
  readonly key: string;
}

export interface SearchPreferences {
  readonly searchEngine: "google" | "duckduckgo" | "bing" | "custom";
  readonly customSearchUrl: string;
}
