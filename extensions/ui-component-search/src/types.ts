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

/** Metadata and fetcher for a UI library */
export interface UILibrary {
  id: LibraryId;
  /** Display name, e.g. "shadcn/ui" */
  name: string;
  /** Icon filename in assets/ */
  icon: string;
  /** Base URL of the library's website */
  baseUrl: string;
  /** Fetch the list of components from this library */
  fetchComponents: () => Promise<UIComponent[]>;
}

/** Shape of cached component data per library */
export interface CachedData {
  timestamp: number;
  components: UIComponent[];
}
