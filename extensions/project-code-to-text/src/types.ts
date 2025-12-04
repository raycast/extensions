// src/types.ts
import ignore from "ignore";

/**
 * Represents a file or directory within the project structure.
 */
export interface ProjectEntry {
  /** The name of the file or directory. */
  name: string;
  /** The relative path from the project root. */
  path: string;
  /** The type of the entry. */
  type: "file" | "directory";
  /** The size of the entry in bytes. Undefined for directories if not calculated. */
  size?: number;
  /** The programming language of the file, if applicable. */
  language?: string;
  /** The content of the file, or a message indicating why content is not included. */
  content?: string;
  /** For directories, an array of child entries. */
  children?: ProjectEntry[];
}

/**
 * Information about the progress of file processing.
 */
export interface ProgressInfo {
  scannedPath: string;
  filesCollected: number;
  totalSize?: number;
  timeElapsed?: number;
}

/**
 * Options for processing a directory recursively.
 * @internal
 */
export interface ProcessDirectoryOptions {
  projectRoot: string;
  currentPath: string;
  ignoreFilter: ReturnType<typeof ignore>;
  maxFileSizeBytes: number;
  onProgress?: (info: ProgressInfo) => void;
  safetyLimits?: {
    maxFiles: number;
    maxScanTimeMs: number;
    maxTotalSizeBytes: number;
    startTime: number;
    filesProcessed: number;
    totalSize: number;
  };
}

/**
 * Configuration for the project code generation process.
 */
export interface GenerationConfig {
  /** The absolute path to the root of the project directory to be processed. */
  projectDirectory: string;
  /**
   * The desired name for the output file.
   * Note: This is used for metadata and constructing the final path,
   * but the core processing logic might not use it directly if path is handled externally.
   */
  outputFileName: string;
  /** The maximum size in bytes for including individual file content. */
  maxFileSizeBytes: number;
  /** Whether to include AI-specific instruction and guide tags in the output. */
  includeAiInstructions: boolean;
}

/**
 * Information about Finder selection for UI decision making.
 */
export interface FinderSelectionInfo {
  /** Available options based on the selection */
  hasFiles: boolean;
  hasDirectories: boolean;
  /** Paths of selected files */
  selectedFiles: string[];
  /** Suggested directory path (parent of files or selected directory) */
  suggestedDirectory: string;
  /** Display names for UI */
  fileNames: string[];
  directoryName?: string;
}

/**
 * Enhanced configuration for project code generation with file-specific options.
 */
export interface EnhancedGenerationConfig extends GenerationConfig {
  /** Whether to process only specific files instead of entire directory */
  processOnlySelectedFiles?: boolean;
  /** List of specific file paths to process (when processOnlySelectedFiles is true) */
  selectedFilePaths?: string[];
  /** List of custom ignore patterns */
  additionalIgnorePatterns?: string;
}

/**
 * Configuration specifically for the core file processing logic,
 * omitting outputFileName as it's primarily for UI/path construction.
 */
export type FileProcessorConfig = Omit<EnhancedGenerationConfig, "outputFileName">;
