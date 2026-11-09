import type { ExtraLibraryId } from "./extra-libraries";

/** Lucide and Hugeicons always ship; any other library comes from `extra-libraries.ts`. */
export type CoreLibraryId = "hugeicons" | "lucide";
export type LibraryId = CoreLibraryId | ExtraLibraryId;

/** Labeled shows names under the tiles; Compact fits one more across and shows names on hover. */
export type TileLayout = "labeled" | "compact";

/** One drawing element, as the libraries publish them: `[tag, attributes]`. */
export type IconNode = [string, Record<string, string>];

export interface IconEntry {
  /** The library's own name, e.g. "ticket-01" or "ticket". Unique within a library. */
  name: string;
  /** The React export, e.g. "Ticket01Icon" or "Ticket". */
  exportName: string;
  /** Search tags, lowercase. */
  tags: string[];
  /** Category ids. The first is the icon's home section in the grouped view. */
  categories: string[];
  /** Tile drawing, relative to the library's cache folder. */
  file: string;
  /** The drawing's own box when it isn't 0 0 24 24. */
  viewBox?: string;
  /** The extension SDK's name, as in `Icon.Bubble`, for a library whose icons the SDK also offers. */
  sdkName?: string;
}

export interface Catalog {
  library: LibraryId;
  icons: IconEntry[];
  /** Names in the library's New set. */
  newNames: string[];
  /** When the catalog was last downloaded, epoch ms. */
  fetchedAt: number;
  /** Version of the drawings in use: a package version for Hugeicons, the download time for Lucide. */
  drawingsVersion: string;
  /** Catalog names left out: no free drawing, or a duplicate of another name. */
  dropped: string[];
  /** The older release the New set is measured against. */
  baselineVersion?: string;
}

/**
 * The Name Format setting: the name code imports (`Ticket01Icon`, `Ticket`) or the icon's own name
 * (`ticket-01`, `ticket`). Hugeicons and Lucide accept both; Hugeicons has no bare `Ticket01`.
 */
export type NameFormat = "import" | "icon";

export interface LibraryInfo {
  title: string;
  /** The search bar's text when Raycast AI is available, and when it isn't. */
  placeholder: { ai: string; plain: string };
  siteName: string;
  /** Its on/off switch in the Libraries setting. */
  setting: string;
  /** Three plain shapes from the library that AI Results' loading tile cycles through. */
  spinner: string[];
  /** Filled shapes drawn at their own weight, so the Stroke Width setting doesn't apply. */
  filled?: boolean;
  /** The icon's name in one format, without the library in front. */
  name: (icon: IconEntry, format: NameFormat) => string;
  pageUrl: (icon: IconEntry) => string;
  /** `strokeWidth` is added as a prop only when it isn't the library's default. `svg` is the icon as copied. */
  reactCode: (icon: IconEntry, strokeWidth?: string, svg?: string) => string;
}
