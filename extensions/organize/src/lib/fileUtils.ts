import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { trash } from "@raycast/api";
import { UndoManager } from "./undoManager";

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  mtime: Date;
  birthtime: Date;
  extension: string;
}

/**
 * Move a file to macOS Trash using Raycast's built-in trash method
 */
export async function moveToTrash(filePath: string, undoManager?: UndoManager): Promise<boolean> {
  try {
    await trash(filePath);

    // Record the operation for undo
    if (undoManager) {
      undoManager.recordTrash(filePath);
    }

    return true;
  } catch (error) {
    console.error(`Failed to move ${filePath} to trash:`, error);
    return false;
  }
}

/**
 * Calculate MD5 hash of a file for duplicate detection
 */
export async function getFileHash(filePath: string): Promise<string | null> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash("md5");
    hash.update(fileBuffer);
    return hash.digest("hex");
  } catch (error) {
    console.error(`Failed to hash ${filePath}:`, error);
    return null;
  }
}

/**
 * Convert bytes to human readable format
 */
export function formatFileSize(sizeBytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get file information
 */
export async function getFileInfo(filePath: string): Promise<FileInfo | null> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return null;

    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      mtime: stats.mtime,
      birthtime: stats.birthtime,
      extension: path.extname(filePath).toLowerCase(),
    };
  } catch (error) {
    console.error(`Failed to get info for ${filePath}:`, error);
    return null;
  }
}

/**
 * List all files in a directory (non-recursive)
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => path.join(dirPath, entry.name));
  } catch (error) {
    console.error(`Failed to list files in ${dirPath}:`, error);
    return [];
  }
}

/**
 * List all directories in a directory (non-recursive)
 */
export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => path.join(dirPath, entry.name));
  } catch (error) {
    console.error(`Failed to list directories in ${dirPath}:`, error);
    return [];
  }
}

/**
 * Ensure a directory exists, create if it doesn't
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
  }
}

/**
 * Move a file/directory to a destination with conflict resolution
 */
export async function moveWithConflictResolution(
  sourcePath: string,
  destDir: string,
  undoManager?: UndoManager,
): Promise<string | null> {
  try {
    await ensureDirectory(destDir);

    const basename = path.basename(sourcePath);
    const ext = path.extname(basename);
    const nameWithoutExt = path.basename(basename, ext);

    let destPath = path.join(destDir, basename);
    let counter = 1;

    // Find available filename
    while (true) {
      try {
        await fs.access(destPath);
        // File exists, try next number
        destPath = path.join(destDir, `${nameWithoutExt}_${counter}${ext}`);
        counter++;
      } catch {
        // File doesn't exist, we can use this name
        break;
      }
    }

    await fs.rename(sourcePath, destPath);

    // Record the operation for undo
    if (undoManager) {
      undoManager.recordMove(sourcePath, destPath);
    }

    return destPath;
  } catch (error) {
    console.error(`Failed to move ${sourcePath} to ${destDir}:`, error);
    return null;
  }
}
