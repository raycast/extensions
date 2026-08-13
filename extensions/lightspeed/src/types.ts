export type SearchScope = "all" | "files" | "folders" | "documents" | "images" | "audio" | "video";

export interface SearchResult {
  name: string;
  parentPath: string;
  fullPath: string;
  size?: number;
  modifiedAt?: Date;
  isDirectory: boolean;
}

export interface Preferences {
  indexRoots?: string;
  excludedPaths?: string;
  maxResults: string;
}
