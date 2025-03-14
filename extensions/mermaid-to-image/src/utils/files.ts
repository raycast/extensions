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
