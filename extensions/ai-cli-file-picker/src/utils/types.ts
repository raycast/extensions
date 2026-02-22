export interface FileItem {
  path: string;
  name: string;
  mtime: number; // ms since epoch, used for sorting
}

export interface Preferences {
  additionalDirs: string;
  maxRecentFiles: string; // textfield type in manifest, parse with parseInt() at use site
  includeDownloads: boolean;
}
