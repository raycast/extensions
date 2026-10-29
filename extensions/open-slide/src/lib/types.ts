import type { Folder } from "./parse";

export type Site = {
  id: string;
  /** Normalised base URL, including any subpath the deck is hosted under. */
  base: string;
  label: string;
  addedAt: number;
};

export type Deck = {
  /** Unique across sites — slide ids collide between sites. */
  key: string;
  id: string;
  title: string;
  theme: string | null;
  /** The sidebar folder its author filed it under, when the deck has one. */
  folder: Folder | null;
  createdAt: number | null;
  pageCount: number | null;
  /** Index-aligned with `pages`; `null` where the deck has no note. */
  notes: (string | null)[];
  /** Text per page, in display order. */
  pages: string[][];
  /** Everything the deck renders, for full-text search. */
  text: string[];
  url: string;
  presenterUrl: string;
  /** The theme's page on the site, when the deck declares one. */
  themeUrl: string | null;
  site: Site;
};

export type SourceFailure = {
  site: Site;
  message: string;
};

export type SlideIndex = {
  sites: Site[];
  decks: Deck[];
  failures: SourceFailure[];
};
