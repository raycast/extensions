# Schema and Data Models (Schema)

## Core Types and Interfaces

```typescript
/**
 * Supported Photoshop document file extensions.
 */
export type PhotoshopExtension = "psd" | "psb" | "psdt" | "pdd";

/**
 * Pixel dimensions and print resolution metadata.
 */
export interface DocumentDimensions {
  width: number;
  height: number;
  dpi?: number;
  aspectRatio?: string;
}

/**
 * Represents an indexed or recent Photoshop document file.
 */
export interface PhotoshopFile {
  /** Unique identifier, typically normalised absolute file path */
  id: string;

  /** File base name with extension (e.g. "Banner.psd") */
  name: string;

  /** File base name without extension (e.g. "Banner") */
  title: string;

  /** Absolute POSIX file path */
  path: string;

  /** Parent directory path */
  directory: string;

  /** Parent directory display name */
  directoryName: string;

  /** Lowercase file extension without dot (e.g. "psd") */
  extension: PhotoshopExtension | string;

  /** Raw size in bytes */
  sizeInBytes: number;

  /** Human-readable formatted file size (e.g. "12.4 MB") */
  formattedSize: string;

  /** File filesystem modification date */
  lastModifiedDate: Date;

  /** Timestamp when last opened in Photoshop (if known from MRU or Spotlight) */
  lastOpenedDate?: Date;

  /** Pixel dimensions and DPI resolution */
  dimensions?: DocumentDimensions;

  /** Color space (e.g. "RGB", "CMYK", "Grayscale") */
  colorSpace?: string;

  /** Number of bits per sample (e.g. 8, 16, 32) */
  bitsPerSample?: number;

  /** List of extracted layer names (from Spotlight index) */
  layers?: string[];

  /** Path to rendered PNG thumbnail on disk */
  thumbnailPath?: string;

  /** Whether the file currently exists on the local filesystem */
  exists: boolean;
}

/**
 * View presentation mode.
 */
export type ViewMode = "grid" | "list";

/**
 * Result of Photoshop cache purging routine.
 */
export interface CacheClearResult {
  success: boolean;
  purgedMemory: boolean;
  diskBytesFreed: number;
  formattedFreedSpace: string;
  clearedPaths: string[];
  error?: string;
}

/**
 * Extension preferences configured in Raycast settings.
 */
export interface ExtensionPreferences {
  defaultViewMode: ViewMode;
  gridColumns: "3" | "4" | "5" | "6" | "8";
  searchScope: "home" | "system";
  showLayersInList: boolean;
}
```
