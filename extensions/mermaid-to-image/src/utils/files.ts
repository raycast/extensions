import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";

/**
 * Safely clean up temporary files
 */
export function cleanupTempFile(filePath: string | null): void {
  if (!filePath) return;

  try {
    fs.unlinkSync(filePath);
    console.log("Temporary file cleaned up:", filePath);
  } catch (error) {
    // Only log if it's not a "file not found" error
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to clean up temporary file:", error);
    }
  }
}

/**
 * Ensures the support directory exists
 */
export function ensureSupportDirectory(): void {
  try {
    if (!fs.existsSync(environment.supportPath)) {
      fs.mkdirSync(environment.supportPath, { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create support directory:", error);
    throw new Error(`Failed to create support directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clean up old temporary diagram files (older than 1 hour)
 * This prevents accumulation of orphaned files from crashes or incomplete cleanups
 */
export function cleanupOldTempFiles(): void {
  try {
    if (!fs.existsSync(environment.supportPath)) return;

    const files = fs.readdirSync(environment.supportPath);
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000; // 1 hour in milliseconds

    files.forEach((file) => {
      // Only clean up diagram files (both .mmd and image files)
      if (file.startsWith("diagram-")) {
        const filePath = path.join(environment.supportPath, file);
        try {
          const stats = fs.statSync(filePath);
          // Delete files older than 1 hour
          if (stats.mtimeMs < oneHourAgo) {
            fs.unlinkSync(filePath);
            console.log("Cleaned up old temporary file:", file);
          }
        } catch (error) {
          // Skip files that can't be accessed
          console.error("Failed to check/delete file:", file, error);
        }
      }
    });
  } catch (error) {
    console.error("Failed to cleanup old temp files:", error);
    // Don't throw - this is a non-critical cleanup operation
  }
}

/**
 * Creates a temporary file with the given content
 */
export function createTempFile(content: string, extension: string): string {
  ensureSupportDirectory();
  const tempFile = path.join(environment.supportPath, `diagram-${Date.now()}.${extension}`);

  try {
    fs.writeFileSync(tempFile, content);
    return tempFile;
  } catch (error: unknown) {
    console.error("Failed to write temporary file:", error);
    throw new Error(`Failed to create temporary file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
