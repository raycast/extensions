export type GetFilePathsHelper = {
  path: string;
  excludedFolders?: string[];
  includedFileExtensions?: string[];
  /** Paths relative to `path` to check instead of every file with an included extension */
  includedFilePaths?: string[];
};
