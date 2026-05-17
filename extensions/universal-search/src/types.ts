export type ResultKind =
  | "note"
  | "file-content"
  | "file"
  | "folder"
  | "bookmark"
  | "contact"
  | "event"
  | "application"
  | "photo"
  | "script-command";

export interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  /** Subtitle shown under the title (e.g. shortened path, host). */
  subtitle?: string;
  /** Absolute path on disk (files/folders/notes) or undefined for bookmarks. */
  path?: string;
  /** URL (bookmarks / openable scheme like addressbook:// or calshow:). */
  url?: string;
  /** Short preview of a matched line (file-content / note matches). */
  matchPreview?: string;
  /** Line number of the match (file-content / note). */
  matchLine?: number;
  /** File modification time (epoch ms). */
  modifiedAt?: number;
  /** File size in bytes. */
  size?: number;
  /** Contact emails / phones (contact results). */
  emails?: string[];
  phones?: string[];
  /** Base64-encoded thumbnail image (contact results, when available). */
  imageBase64?: string;
  /** Event start / end (epoch ms). */
  eventStart?: number;
  eventEnd?: number;
  /** Event location. */
  location?: string;
  /** Calendar name. */
  calendar?: string;
  /** Photos.app asset local identifier. */
  photoIdentifier?: string;
  /** Photos.app asset dimensions. */
  photoWidth?: number;
  photoHeight?: number;
  /** Photos.app asset creation date (epoch ms). */
  photoCreatedAt?: number;
  /** Raycast Script Command metadata. */
  scriptMode?: string;
  scriptPackageName?: string;
  scriptDescription?: string;
  scriptSchemaVersion?: string;
  scriptArgumentCount?: number;
}

export interface Preferences {
  obsidianVaultPath?: string;
  enableObsidian: boolean;
  enableFileContents: boolean;
  enableFileNames: boolean;
  enableFolders: boolean;
  enableBookmarks: boolean;
  enableContacts: boolean;
  enableEvents: boolean;
  enableApplications: boolean;
  enablePhotos: boolean;
  enableScriptCommands: boolean;
  scriptCommandsPath?: string;
  photosLibraryPath?: string;
  eventLookbackDays?: string;
  eventLookaheadDays?: string;
  maxPerSource?: string;
  maxApplications?: string;
  maxFileContents?: string;
  maxFileNames?: string;
  maxFolders?: string;
  maxObsidian?: string;
  maxBookmarks?: string;
  maxContacts?: string;
  maxEvents?: string;
  maxPhotos?: string;
  maxScriptCommands?: string;
  showRecentItems?: boolean;
  recentItemsCount?: string;
  priorityApplications?: string;
  priorityFileContents?: string;
  priorityFileNames?: string;
  priorityFolders?: string;
  priorityObsidian?: string;
  priorityBookmarks?: string;
  priorityContacts?: string;
  priorityEvents?: string;
  priorityPhotos?: string;
  priorityScriptCommands?: string;
  sectionOrder?: string;
  excludeFileContents?: string;
  excludeFileNames?: string;
  excludeFolders?: string;
  excludeObsidian?: string;
  excludeBookmarks?: string;
  excludeGlobal?: string;
  showPreviewPath?: boolean;
  showPreviewMetadata?: boolean;
  defaultEditor?: string;
}

export interface SourceContext {
  query: string;
  limit: number;
  vaultPath?: string;
  scriptCommandsPath?: string;
  signal: AbortSignal;
  /** Path prefixes (or URL substrings for bookmarks) to exclude from this source. */
  exclude?: string[];
}

export interface SourceOutput {
  /** Capped at `limit`. */
  results: SearchResult[];
  /** Total number of matches found (may exceed `results.length`). */
  total: number;
  /** True when scanning stopped early; `total` is a lower bound. */
  truncated?: boolean;
}
