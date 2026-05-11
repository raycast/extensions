export interface Session {
  /** UUID extracted from JSONL filename (without .jsonl extension). */
  uuid: string;

  /** Working directory of the original session (absolute path). */
  cwd: string;

  /** Truncated first user message (max 90 chars). Used as list title. */
  title: string;

  /** Full first user message — used in detail view. */
  firstUserMessage: string;

  /** ISO 8601 timestamp of the first user message. */
  timestamp: string;

  /** Absolute path to the .jsonl file. */
  jsonlPath: string;

  /** Last-modified time of the .jsonl (epoch ms) — used as cache key. */
  mtime: number;
}

export interface DiscoveredFile {
  path: string;
  mtime: number;
}

export interface Preferences {
  terminalApp: "iterm2" | "terminal";
  sessionLimit: string; // Raycast textfield always returns string
  jsonlRootPath: string;
}
