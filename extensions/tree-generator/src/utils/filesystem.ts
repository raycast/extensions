import { readdir, stat } from "fs/promises";
import { join } from "path";

/**
 * File system utilities for directory traversal
 */
export class FileSystemUtils {
  /**
   * Get directory contents with file information
   */
  static async getDirectoryContents(dirPath: string): Promise<
    Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      size?: number;
    }>
  > {
    try {
      const entries = await readdir(dirPath);
      const contents = [];

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
        } catch (error) {
          // Skip files that can't be accessed
          console.warn(`Cannot access ${fullPath}:`, error);
        }
      }

      return contents.sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
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
}
