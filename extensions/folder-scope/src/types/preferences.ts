export type CaseMode = "smart" | "sensitive" | "insensitive";
export type SearchMode = "text" | "regex";
export type EngineChoice = "automatic" | "bundled" | "system" | "node";
export type NoFinderBehavior = "prompt" | "default-directory" | "home";
export type EditorType = "vscode" | "cursor" | "zed" | "sublime" | "rider";

/** Preferences after validation — invalid stored values are replaced by safe defaults. */
export interface ExtensionPreferences {
  defaultDirectory: string | null;
  noFinderBehavior: NoFinderBehavior;
  preferredEngine: EngineChoice;
  defaultCaseMode: CaseMode;
  defaultSearchMode: SearchMode;
  /** null means unlimited depth. */
  defaultMaxDepth: number | null;
  maxResults: number;
  maxFileSizeBytes: number;
  /** Context lines before and after the match in the detail preview. */
  previewContextLines: number;
  /** Whether the detail preview starts open. */
  showMatchPreview: boolean;
  searchHiddenFiles: boolean;
  respectIgnoreFiles: boolean;
  excludedDirectories: string[];
  includedExtensions: string[];
  debounceMs: number;
  preferredEditor: EditorType;
}
