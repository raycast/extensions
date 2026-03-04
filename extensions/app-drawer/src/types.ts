export interface Folder {
  id: string;
  name: string;
  appBundleIds: string[];
}

/**
 * A top-level grid item: either an app (bundleId) or a folder (folderId).
 * The order of this array determines display order in the main grid.
 */
export type GridEntry = { type: "app"; bundleId: string } | { type: "folder"; folderId: string };

export interface DrawerConfig {
  version: 1;
  folders: Folder[];
  /** Ordered list of items in the main grid (apps and folders interleaved). */
  gridOrder: GridEntry[];
}

export const DEFAULT_CONFIG: DrawerConfig = {
  version: 1,
  folders: [],
  gridOrder: [],
};
