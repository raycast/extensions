export type PhotoshopExtension = "psd" | "psb" | "psdt" | "pdd";

export type ViewMode = "grid" | "list";

export type SortOption = "name-asc" | "name-desc" | "recent" | "date-desc" | "date-asc" | "size-desc" | "size-asc";

export interface DocumentDimensions {
  width: number;
  height: number;
  dpi?: number;
  aspectRatio?: string;
}

export interface PhotoshopFile {
  id: string;
  name: string;
  title: string;
  path: string;
  directory: string;
  directoryName: string;
  extension: string;
  sizeInBytes: number;
  formattedSize: string;
  lastModifiedDate: Date;
  lastOpenedDate?: Date;
  dimensions?: DocumentDimensions;
  colorSpace?: string;
  bitsPerSample?: number;
  layers?: string[];
  thumbnailPath?: string;
  exists: boolean;
}

export interface CacheClearResult {
  success: boolean;
  purgedMemory: boolean;
  diskBytesFreed: number;
  formattedFreedSpace: string;
  clearedPaths: string[];
  error?: string;
}

export interface ExtensionPreferences {
  defaultViewMode: ViewMode;
  gridColumns: "3" | "4" | "5" | "6" | "8";
  searchScope: "home" | "all";
}
