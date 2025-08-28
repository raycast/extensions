import { ObsidianNote } from "../types";

/**
 * Service for scanning Obsidian vault directories and finding markdown files
 */
export class ObsidianScanner {
  constructor(
    private vaultPath: string,
    private excludeFolders: string[] = []
  ) {}

  /**
   * Scans the vault for markdown files and returns them as ObsidianNote objects
   */
  async scanVault(): Promise<ObsidianNote[]> {
    // Implementation will be added in the next phase
    return [];
  }

  /**
   * Scans for changes since the last scan
   */
  async scanForChanges(_lastScanTime: Date): Promise<ObsidianNote[]> {
    // Implementation will be added in the next phase
    return [];
  }
}
