export type SearchDirectorySource =
  "finder-selection" | "finder-file-parent" | "finder-window" | "default-directory" | "user-picked" | "home";

export interface SearchDirectory {
  /** Absolute path to the directory being searched. */
  path: string;
  source: SearchDirectorySource;
}
