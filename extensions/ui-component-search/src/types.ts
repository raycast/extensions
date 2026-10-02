/**
 * Shared type definitions for the UI Components Explorer extension.
 */

/** Identifier for each supported UI library */
export type LibraryId =
  "shadcn" | "primeng" | "material" | "spartan" | "taiga" | "mantine" | "react-spectrum" | "chakra";

/** A single UI component entry */
export interface UIComponent {
  /** Display name, e.g. "Alert Dialog" */
  name: string;
  /** URL-friendly slug, e.g. "alert-dialog" */
  slug: string;
  /** Full URL to the component documentation */
  url: string;
  /** Which library this component belongs to */
  library: LibraryId;
}

/**
 * Where a library's component list came from.
 * - "live":     successfully scraped/parsed from the docs site
 * - "fallback": the live fetch failed (network error, non-OK response, or the
 *               markup could not be parsed) and the provider's bundled static
 *               list was used instead. A broken scraper must stay visible.
 */
export type ComponentSource = "live" | "fallback";

/** Result of a provider fetch: the components plus how they were obtained. */
export interface ProviderResult {
  components: UIComponent[];
  source: ComponentSource;
}

/** Metadata and fetcher for a UI library */
export interface UILibrary {
  id: LibraryId;
  /** Display name, e.g. "shadcn/ui" */
  name: string;
  /** Icon filename in assets/ */
  icon: string;
  /** Base URL of the library's website */
  baseUrl: string;
  /**
   * Fetch the list of components from this library.
   * Resolves with the components and their source status; rejects only when
   * there is no usable data at all (no live result and no static fallback).
   */
  fetchComponents: () => Promise<ProviderResult>;
}

/** Shape of cached component data per library */
export interface CachedData {
  timestamp: number;
  components: UIComponent[];
  /** Source status at the time the data was cached (defaults to "live" for legacy entries). */
  source: ComponentSource;
}
