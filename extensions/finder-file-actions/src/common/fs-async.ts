import fs from "fs-extra";

// Constants for memory management
const BUFFER_SIZE = 64 * 1024; // 64KB chunks for streaming
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
const BATCH_SIZE = 100; // Number of items to process in memory at once
const MAX_CONCURRENT_OPS = 3; // Maximum concurrent operations

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

// Helper function to clean up resources
async function cleanup(...streams: (fs.ReadStream | fs.WriteStream)[]): Promise<void> {
  for (const stream of streams) {
    if (!stream.destroyed) {
      stream.destroy();
    }
  }
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
    return { success: true, skipped: false };
  } catch (error) {
    // Clean up destination if something went wrong
    await fs.remove(destPath).catch(() => {});
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error during move"),
      skipped: false,
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

    const readStream = fs.createReadStream(sourcePath, {
      highWaterMark: BUFFER_SIZE, // Control buffer size
    });
    const writeStream = fs.createWriteStream(destPath, {
      flags: options.overwrite ? "w" : "wx",
      highWaterMark: BUFFER_SIZE, // Control buffer size
    });

    // Set up error handlers first
    const handleError = async (error: Error) => {
      await cleanup(readStream, writeStream);
      await fs.remove(destPath).catch(() => {});
      resolve({
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error during copy"),
        skipped: false,
      });
    };

    readStream.on("error", handleError);
    writeStream.on("error", handleError);

    readStream.on("data", (buffer) => {
      bytesRead += buffer.length;
      if (options.onProgress) {
        options.onProgress((bytesRead / stats.size) * 100);
      }
    });

    writeStream.on("finish", async () => {
      await cleanup(readStream, writeStream);
      resolve({ success: true, skipped: false });
    });

    readStream.pipe(writeStream);
  });
}

// Generator function for memory-efficient directory reading
async function* readDirectoryGenerator(dirPath: string): AsyncGenerator<string> {
  try {
    const items = await fs.readdir(dirPath);
    for (const item of items) {
      yield item;
    }
  } catch {
    // No items to yield on error
  }
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
   * Read directory contents with error handling and memory efficiency
   */
  async readDirectory(dirPath: string): Promise<string[]> {
    const results: string[] = [];
    for await (const item of readDirectoryGenerator(dirPath)) {
      results.push(item);
    }
    return results;
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

      // For large files, use streaming with progress
      const stats = await this.getStats(sourcePath);
      if (stats && stats.size > LARGE_FILE_THRESHOLD) {
        return await moveWithProgress(sourcePath, destPath, options);
      }

      // For smaller files, use direct move
      await fs.move(sourcePath, destPath, { overwrite: options.overwrite });
      return { success: true, skipped: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error during move"),
        skipped: false,
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

      // For large files, use streaming with progress
      const stats = await this.getStats(sourcePath);
      if (stats && stats.size > LARGE_FILE_THRESHOLD) {
        return await copyWithProgress(sourcePath, destPath, options);
      }

      // For smaller files, use direct copy
      await fs.copy(sourcePath, destPath, { overwrite: options.overwrite });
      return { success: true, skipped: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error during copy"),
        skipped: false,
      };
    }
  },

  /**
   * Batch process multiple files with concurrency control and memory management
   */
  async batchProcess<T>(
    items: string[],
    operation: (item: string) => Promise<T>,
    options: {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<T[]> {
    const concurrency = Math.min(options.concurrency || MAX_CONCURRENT_OPS, MAX_CONCURRENT_OPS);
    const results: T[] = [];
    let completed = 0;

    // Process items in smaller batches to manage memory
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, Math.min(i + BATCH_SIZE, items.length));

      // Process each batch with controlled concurrency
      const batchPromises = [];
      for (let j = 0; j < batch.length; j += concurrency) {
        const concurrentBatch = batch.slice(j, j + concurrency);
        const batchResults = await Promise.all(
          concurrentBatch.map(async (item) => {
            const result = await operation(item);
            completed++;
            options.onProgress?.(completed, items.length);
            return result;
          })
        );
        results.push(...batchResults);

        // Allow GC to clean up between batches
        batchPromises.length = 0;
      }
    }

    return results;
  },
};
