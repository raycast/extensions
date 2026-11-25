export type PremiereExtension = "prproj";

export type ViewMode = "grid" | "list";

export type SortOption = "recent" | "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc";

export interface VideoDimensions {
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface PremiereFile {
  id: string;
  name: string;
  title: string;
  path: string;
  directory: string;
  directoryName: string;
  extension: PremiereExtension;
  sizeInBytes: number;
  formattedSize: string;
  lastModifiedDate: Date;
  lastOpenedDate?: Date;
  version?: string;
  sequences?: string[];
  sequenceCount?: number;
  dimensions?: VideoDimensions;
  frameRate?: string;
  isProductionProject?: boolean;
  productionName?: string;
  thumbnailPath?: string;
  exists: boolean;
}

export interface CacheClearResult {
  success: boolean;
  mediaCacheFreed: number;
  peakFilesFreed: number;
  totalFreed: number;
  formattedFreedSpace: string;
  clearedDirectories: string[];
  error?: string;
}

export interface ExtensionPreferences {
  defaultViewMode: ViewMode;
  gridColumns: "3" | "4" | "5" | "6" | "8";
  searchScope: "home" | "all";
}
