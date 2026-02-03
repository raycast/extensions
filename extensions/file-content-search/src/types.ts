/**
 * User preferences configured in Raycast extension settings.
 */
export type Preferences = {
  /** Default directory path for file searches */
  defaultSearchPath: string;
  /** Whether to use regex patterns by default */
  defaultUseRegex: boolean;
  /** Comma-separated list of directories to exclude from search */
  excludedDirectories: string;
  /** Comma-separated list of file extensions to exclude (e.g., png,jpg,pdf) */
  excludedExtensions: string;
};

/**
 * Configuration options for executing a search operation.
 */
export type Config = {
  /** Whether to interpret the search pattern as a regular expression */
  useRegex: boolean;
  /** Directory path to search within */
  searchPath: string;
  /** Maximum time in milliseconds before search times out */
  timeout: number;
  /** Maximum number of results to return */
  maxResults: number;
};

/**
 * Complete search options including pattern and configuration.
 */
export type SearchOptions = {
  /** The search pattern (plain text or regex) */
  pattern: string;
} & Config;

/**
 * Compact grep entry using path index for memory efficiency.
 * Path is stored as index into a shared paths array.
 */
export type CompactGrepEntry = {
  /** Index into shared paths array */
  pathIndex: number;
  /** Line number where match occurs (1-indexed) */
  line: number;
  /**
   * Character offset (0-indexed) in the line where the match starts.
   * Useful for highlighting the matched portion in the UI.
   */
  offset: number;
  /** The matched line content */
  content: string;
};

/**
 * A resolved grep entry with full path (for component use).
 */
export type GrepEntry = {
  /** Unique identifier for this result (numeric for memory efficiency) */
  id: number;
  /** Absolute file path where match was found */
  path: string;
  /** Line number where match occurs (1-indexed) */
  line: number;
  /**
   * Character offset (0-indexed) in the line where the match starts.
   */
  offset: number;
  /** The matched line content */
  content: string;
};

/**
 * Store for grep results with interned paths.
 */
export type GrepStore = {
  /** Unique file paths (interned) */
  paths: string[];
  /** Compact entries referencing paths by index */
  entries: CompactGrepEntry[];
};

/**
 * Columnar storage for grep results (memory efficient).
 * Uses typed arrays for numeric fields.
 */
export type ColumnarGrepStore = {
  /** Unique file paths (interned) */
  paths: string[];
  /** Content strings */
  contents: string[];
  /** Path indices (Uint16Array - max 65535 unique paths) */
  pathIndices: Uint16Array;
  /** Line numbers */
  lines: Uint32Array;
  /** Character offsets */
  offsets: Uint32Array;
  /** Current number of entries */
  length: number;
  /** Allocated capacity */
  capacity: number;
};

/**
 * Represents a single entry in the user's search history.
 * Used to persist and display recently executed searches.
 */
export type SearchHistoryEntry = {
  /** The search pattern (plain text or regex) that was executed */
  pattern: string;
  /** Unix timestamp (milliseconds since epoch) when the search was performed */
  timestamp: number;
  /** Indicates whether regex mode was enabled for this search */
  useRegex: boolean;
};

/**
 * Surrounding context for a matched line in file preview.
 */
export type FileContext = {
  /** Lines appearing before the matched line */
  before: string[];
  /** The matched line content */
  match: string;
  /** Lines appearing after the matched line */
  after: string[];
};
