import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";

/**
 * Utility functions for managing temporary files
 * Ensures proper cleanup of temporary image files
 */

/**
 * Safely deletes a file if it exists
 */
export function safeDeleteFile(filePath: string): void {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Silently ignore cleanup errors to avoid disrupting user flow
    console.warn(`Failed to delete temporary file: ${filePath}`, error);
  }
}

/**
 * Safely deletes multiple files
 */
export function safeDeleteFiles(filePaths: string[]): void {
  filePaths.forEach((filePath) => safeDeleteFile(filePath));
}

/**
 * Clean up old temporary files in support directory
 * Removes files older than specified age (default: 1 hour)
 */
export function cleanupOldTempFiles(maxAgeMs: number = 60 * 60 * 1000): void {
  try {
    const supportDir = environment.supportPath;
    if (!fs.existsSync(supportDir)) {
      return;
    }

    const files = fs.readdirSync(supportDir);
    const now = Date.now();
    const tempFilePatterns = [
      /^preview-\d+\.png$/,
      /^preview-thumb-\d+\.png$/,
      /^.*-output-\d+\.png$/,
      /^clipboard-image-\d+\.png$/,
    ];

    files.forEach((file) => {
      const isTempFile = tempFilePatterns.some((pattern) => pattern.test(file));
      if (!isTempFile) return;

      const filePath = path.join(supportDir, file);
      try {
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          safeDeleteFile(filePath);
        }
      } catch (error) {
        // Ignore errors for individual files
        console.warn(`Failed to check file age: ${filePath}`, error);
      }
    });
  } catch (error) {
    // Don't disrupt user experience if cleanup fails
    console.warn("Failed to cleanup old temporary files", error);
  }
}

/**
 * Clean up all temporary files matching patterns
 */
export function cleanupAllTempFiles(): void {
  try {
    const supportDir = environment.supportPath;
    if (!fs.existsSync(supportDir)) {
      return;
    }

    const files = fs.readdirSync(supportDir);
    const tempFilePatterns = [
      /^preview-\d+\.png$/,
      /^preview-thumb-\d+\.png$/,
      /^.*-output-\d+\.png$/,
      /^clipboard-image-\d+\.png$/,
    ];

    files.forEach((file) => {
      const isTempFile = tempFilePatterns.some((pattern) => pattern.test(file));
      if (isTempFile) {
        safeDeleteFile(path.join(supportDir, file));
      }
    });
  } catch (error) {
    console.warn("Failed to cleanup all temporary files", error);
  }
}
