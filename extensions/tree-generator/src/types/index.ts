/**
 * Configuration options for generating directory tree
 */
export interface TreeGeneratorOptions {
  /** Maximum depth to traverse */
  maxDepth: number;
  /** Whether to respect .gitignore rules */
  respectGitignore: boolean;
  /** Whether to show hidden files and directories */
  showHidden: boolean;
  /** Whether to show only directories */
  directoriesOnly: boolean;
  /** Whether to show file sizes */
  showSizes: boolean;
  /** Whether to show directory counts (files/dirs in each directory) */
  showCounts: boolean;
  /** Custom patterns to ignore (glob patterns) */
  ignorePatterns: string[];
  /** Root directory to start from */
  rootPath: string;
}

/**
 * Represents a file or directory in the tree structure
 */
export interface TreeNode {
  /** Name of the file or directory */
  name: string;
  /** Full path to the file or directory */
  path: string;
  /** Whether this node represents a directory */
  isDirectory: boolean;
  /** Size of the file in bytes (undefined for directories) */
  size?: number;
  /** Child nodes (only for directories) */
  children?: TreeNode[];
  /** Depth level in the tree */
  depth: number;
}

/**
 * Result of tree generation operation
 */
export interface TreeGenerationResult {
  /** Generated tree structure */
  tree: TreeNode[];
  /** Tree as formatted string */
  treeString: string;
  /** Total number of files */
  fileCount: number;
  /** Total number of directories */
  dirCount: number;
  /** Total size of all files */
  totalSize: number;
  /** Generation time in milliseconds */
  generationTime: number;
  /** Number of files/directories that couldn't be accessed */
  skippedCount: number;
  /** Whether there were any errors during generation */
  hasErrors: boolean;
}

/**
 * Options for formatting tree output
 */
export interface TreeFormatOptions {
  /** Whether to use Unicode box drawing characters */
  useUnicode: boolean;
  /** Whether to show file sizes */
  showSizes: boolean;
  /** Whether to show item counts */
  showCounts: boolean;
  /** Indentation string for each level */
  indent: string;
}

/**
 * Parsed tree structure for file creation
 */
export interface ParsedTreeNode {
  /** Name of the file or directory */
  name: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Depth level in the tree */
  depth: number;
  /** Child nodes (only for directories) */
  children: ParsedTreeNode[];
}

/**
 * Options for creating files from tree
 */
export interface TreeCreationOptions {
  /** Root directory where files should be created */
  rootPath: string;
  /** Whether to overwrite existing files */
  overwriteExisting: boolean;
  /** Project/folder name to create (optional, if provided, creates a new folder) */
  projectName?: string;
}

/**
 * Result of tree creation operation
 */
export interface TreeCreationResult {
  /** Number of directories created */
  directoriesCreated: number;
  /** Number of files created */
  filesCreated: number;
  /** Number of items skipped (already existed) */
  itemsSkipped: number;
  /** Creation time in milliseconds */
  creationTime: number;
  /** List of created paths */
  createdPaths: string[];
  /** List of skipped paths */
  skippedPaths: string[];
  /** Whether there were any errors */
  hasErrors: boolean;
  /** Error messages if any */
  errors: string[];
}
