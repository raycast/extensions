import fs from "fs-extra";

export interface FileStats {
  isDirectory: boolean;
  birthtime: Date;
  mtime: Date;
  atime: Date;
  size: number;
}

export interface FileOperationResult {
  success: boolean;
  error?: Error;
  skipped?: boolean;
}

interface FileOperationOptions {
  overwrite?: boolean;
  onProgress?: (percent: number) => void;
}

// Helper functions
async function moveWithProgress(
  sourcePath: string,
  destPath: string,
  options: FileOperationOptions
): Promise<FileOperationResult> {
  try {
    // First copy with progress
    const copyResult = await copyWithProgress(sourcePath, destPath, options);
    if (!copyResult.success) {
      return copyResult;
    }

    // Then remove the source file
    await fs.remove(sourcePath);
    return { success: true };
  } catch (error) {
    // Clean up destination if something went wrong
    await fs.remove(destPath).catch(() => {});
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error during move"),
    };
  }
}

async function copyWithProgress(
  sourcePath: string,
  destPath: string,
  options: FileOperationOptions
): Promise<FileOperationResult> {
  return new Promise((resolve) => {
    const stats = fs.statSync(sourcePath);
    let bytesRead = 0;

    const readStream = fs.createReadStream(sourcePath);
    const writeStream = fs.createWriteStream(destPath, { flags: options.overwrite ? "w" : "wx" });

    readStream.on("data", (buffer) => {
      bytesRead += buffer.length;
      if (options.onProgress) {
        options.onProgress((bytesRead / stats.size) * 100);
      }
    });

    writeStream.on("finish", () => {
      resolve({ success: true });
    });

    writeStream.on("error", (error) => {
      // Clean up the partial destination file
      fs.remove(destPath).catch(() => {});
      resolve({
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error during copy"),
      });
    });

    readStream.pipe(writeStream);
  });
}

export const fsAsync = {
  /**
   * Safely check if a path exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get file/directory stats with error handling
   */
  async getStats(path: string): Promise<FileStats | null> {
    try {
      const stats = await fs.stat(path);
      return {
        isDirectory: stats.isDirectory(),
        birthtime: stats.birthtime,
        mtime: stats.mtime,
        atime: stats.atime,
        size: stats.size,
      };
    } catch {
      return null;
    }
  },

  /**
   * Read directory contents with error handling
   */
  async readDirectory(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch {
      return [];
    }
  },

  /**
   * Move file with proper error handling and progress tracking
   */
  async moveFile(
    sourcePath: string,
    destPath: string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    try {
      // Check if destination exists
      if (!options.overwrite && (await this.exists(destPath))) {
        throw new Error("Destination already exists");
      }

      // For large files, we might want to use a stream to show progress
      const stats = await this.getStats(sourcePath);
      if (stats && stats.size > 10 * 1024 * 1024) {
        // 10MB
        return await moveWithProgress(sourcePath, destPath, options);
      }

      // For smaller files, use direct move
      await fs.move(sourcePath, destPath, { overwrite: options.overwrite });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error during move"),
      };
    }
  },

  /**
   * Copy file with proper error handling and progress tracking
   */
  async copyFile(
    sourcePath: string,
    destPath: string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    try {
      // Check if destination exists
      if (!options.overwrite && (await this.exists(destPath))) {
        throw new Error("Destination already exists");
      }

      // For large files, we might want to use a stream to show progress
      const stats = await this.getStats(sourcePath);
      if (stats && stats.size > 10 * 1024 * 1024) {
        // 10MB
        return await copyWithProgress(sourcePath, destPath, options);
      }

      // For smaller files, use direct copy
      await fs.copy(sourcePath, destPath, { overwrite: options.overwrite });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error during copy"),
      };
    }
  },

  /**
   * Batch process multiple files with concurrency control
   */
  async batchProcess<T>(
    items: string[],
    operation: (item: string) => Promise<T>,
    options: {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<T[]> {
    const concurrency = options.concurrency || 3;
    const results: T[] = [];
    let completed = 0;

    // Process items in batches
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const result = await operation(item);
          completed++;
          options.onProgress?.(completed, items.length);
          return result;
        })
      );
      results.push(...batchResults);
    }

    return results;
  },
};
