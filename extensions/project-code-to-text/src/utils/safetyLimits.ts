import { bytesToMB } from "../constants";
import type { Stats } from "fs";

/**
 * Safety limits configuration for file processing.
 */
export interface SafetyLimits {
  maxFiles: number;
  maxScanTimeMs: number;
  maxTotalSizeBytes: number;
  startTime: number;
  filesProcessed: number;
  totalSize: number;
}

/**
 * Checks if safety limits are exceeded and throws an error if so.
 *
 * @param safetyLimits - The safety limits configuration.
 * @param stats - File stats to check against limits.
 * @param relativePath - Relative path of the file being processed (for error messages).
 * @throws Error if any limit is exceeded.
 */
export function checkSafetyLimits(safetyLimits: SafetyLimits, stats: Stats, relativePath: string): void {
  const timeElapsed = Date.now() - safetyLimits.startTime;
  if (timeElapsed > safetyLimits.maxScanTimeMs) {
    throw new Error(
      `Scan time limit exceeded (${safetyLimits.maxScanTimeMs / 1000}s). ` +
        `Consider using .gitignore to exclude unnecessary files or selecting specific directories.`,
    );
  }

  if (safetyLimits.filesProcessed >= safetyLimits.maxFiles) {
    console.error("[checkSafetyLimits] File count limit exceeded", {
      filesProcessed: safetyLimits.filesProcessed,
      maxFiles: safetyLimits.maxFiles,
      file: relativePath,
    });
    throw new Error(
      `File count limit exceeded (${safetyLimits.maxFiles} files). ` +
        `Consider using .gitignore to exclude files (e.g., node_modules, build, dist) or selecting fewer files/directories.`,
    );
  }

  const projectedTotalSize = safetyLimits.totalSize + (stats.size || 0);
  if (projectedTotalSize >= safetyLimits.maxTotalSizeBytes) {
    console.error("[checkSafetyLimits] Total size limit exceeded", {
      currentSize: bytesToMB(safetyLimits.totalSize),
      fileSize: bytesToMB(stats.size),
      projectedSize: bytesToMB(projectedTotalSize),
      maxSize: bytesToMB(safetyLimits.maxTotalSizeBytes),
      file: relativePath,
    });
    throw new Error(
      `Total size limit exceeded (${bytesToMB(safetyLimits.maxTotalSizeBytes)} MB). ` +
        `Current: ${bytesToMB(safetyLimits.totalSize).toFixed(2)} MB, ` +
        `File: ${bytesToMB(stats.size || 0).toFixed(2)} MB. ` +
        `Consider using .gitignore to exclude large files or selecting fewer files.`,
    );
  }

  safetyLimits.filesProcessed++;
  safetyLimits.totalSize += stats.size || 0;
}
