export type AppKind = "premiere" | "photoshop" | "illustrator" | "aftereffects";

export interface ExtensionDef {
  /** lowercase, no leading dot, e.g. "prproj" */
  ext: string;
  app: AppKind;
  /** human label, e.g. "Premiere Pro" */
  label: string;
}

export interface FileRecord {
  /** absolute path */
  path: string;
  /** basename, e.g. "promo.psd" */
  name: string;
  /** lowercase extension without dot */
  ext: string;
  app: AppKind;
  /** dirname of path */
  folder: string;
  /** mount root this file was found under, e.g. "/" or "/Volumes/YUSOUFU 990" */
  volume: string;
  /** modification time, epoch ms */
  modifiedMs: number;
  /** Spotlight kMDItemLastUsedDate, epoch ms, or null when unknown */
  lastUsedMs: number | null;
  /** size in bytes, or null when unknown */
  sizeBytes: number | null;
}

export interface Drive {
  /** mount path, e.g. "/" or "/Volumes/YUSOUFU 990" */
  path: string;
  /** display name */
  name: string;
  /** Spotlight indexing enabled for this volume */
  indexed: boolean;
  /** true for the root "/" volume */
  isRoot: boolean;
}

/** A place to scan: a whole drive or a user-chosen folder. */
export interface ScanRoot {
  /** absolute path to scan under */
  path: string;
  /** the owning volume is Spotlight-indexed (enables mdfind + last-opened enrichment) */
  indexed: boolean;
  /**
   * Force a filesystem walk instead of mdfind, even on an indexed volume.
   * Used for user-chosen folders because Spotlight's per-subtree index can be
   * incomplete (mdfind silently returns nothing for unindexed subfolders).
   */
  walk?: boolean;
  /** true only for the system root "/" volume (its walk is rooted at $HOME) */
  isRoot?: boolean;
}

export type SortKey = "recent" | "name" | "folder" | "type";
export type AppFilter = AppKind | "all";
