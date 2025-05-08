// src/types.ts

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
 * Options for processing a directory recursively.
 * @internal
 */
export interface ProcessDirectoryOptions {
  projectRoot: string;
  currentPath: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- External library type
  ignoreFilter: any; // Instance of 'ignore' class from the 'ignore' library
  maxFileSizeBytes: number;
  onProgress?: (progress: ProgressInfo) => void;
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
 * Configuration specifically for the core file processing logic,
 * omitting outputFileName as it's primarily for UI/path construction.
 */
export type FileProcessorConfig = Omit<GenerationConfig, "outputFileName">;
