export interface FileResult {
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedDate: Date;
  isDirectory: boolean;
  icon?: string;
}

export type SearchMode = "glob" | "regex";

export type SearchScope =
  | "all"
  | "home"
  | "downloads"
  | "documents"
  | "applications"
  | "config"
  | "custom"
  | string;

export interface SearchOptions {
  maxDepth?: number;
  type?: "f" | "d" | "all";
  hidden?: boolean;
  exclude?: string[];
  limit?: number;
  searchMode?: SearchMode;
  searchPath?: string;
}
