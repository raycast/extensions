export interface IPlatformAdapter {
  platformName: "macOS" | "Windows" | "other";

  /**
   * Discovers recently opened Premiere Pro projects from platform-specific
   * preferences, caches, and system indexes.
   */
  getRecentProjectPaths(limit?: number): Promise<string[]>;

  /**
   * Searches for Premiere Pro project files across the system or home folder.
   */
  searchProjectPaths(searchTerm: string, scope: "home" | "all" | string, limit?: number): Promise<string[]>;

  /**
   * Retrieves the paths to Premiere Pro's media cache and peak file folders.
   */
  getMediaCacheDirectories(): string[];

  /**
   * Normalizes and canonicalizes a file path according to OS filesystem semantics.
   */
  normalizePath(filePath: string): string;

  /**
   * Returns whether the primary filesystem is case-insensitive.
   */
  isCaseInsensitive(): boolean;

  /**
   * Opens the given project file in Adobe Premiere Pro.
   */
  openInPremiere(filePath: string): Promise<void>;

  /**
   * Reveals the file in Finder (macOS) or File Explorer (Windows).
   */
  revealInFileManager(filePath: string): Promise<void>;

  /**
   * Discovers the installed Adobe Premiere Pro application path, if present.
   */
  getAppInstallationPath(): Promise<string | null>;
}
