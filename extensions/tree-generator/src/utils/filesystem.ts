import { readdir, stat } from "fs/promises";
import { join } from "path";

/**
 * File system utilities for directory traversal
 */
export class FileSystemUtils {
  /**
   * Get directory contents with file information
   */
  static async getDirectoryContents(dirPath: string): Promise<{
    contents: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      size?: number;
    }>;
    skippedCount: number;
  }> {
    try {
      const entries = await readdir(dirPath);
      const contents: Array<{
        name: string;
        path: string;
        isDirectory: boolean;
        size?: number;
      }> = [];
      let skippedCount = 0;

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        try {
          const stats = await stat(fullPath);
          contents.push({
            name: entry,
            path: fullPath,
            isDirectory: stats.isDirectory(),
            size: stats.isDirectory() ? undefined : stats.size,
          });
        } catch {
          // Skip files that can't be accessed (permissions, missing files, etc.)
          // Count skipped files for error reporting
          skippedCount++;
          continue;
        }
      }

      const sortedContents = contents.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        contents: sortedContents,
        skippedCount,
      };
    } catch (error) {
      throw new Error(`Cannot read directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Check if a path is a hidden file/directory
   */
  static isHidden(name: string): boolean {
    return name.startsWith(".");
  }

  /**
   * Format file size in human-readable format
   */
  static formatSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  /**
   * Check if a directory is accessible
   */
  static async isAccessible(dirPath: string): Promise<boolean> {
    try {
      await readdir(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path exists
   */
  static async pathExists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
}
