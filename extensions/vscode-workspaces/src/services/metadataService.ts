import { stat, readdir } from "fs/promises";
import { join } from "path";
import { pathExists } from "../utils/fs";
import { exec as execCb } from "child_process";
import { promisify } from "util";

const exec = promisify(execCb);

// ----------------------------------------------
// WORKSPACE METADATA
// ----------------------------------------------

export interface WorkspaceStats {
  size: number; // in bytes
  fileCount: number;
  lastModified: number; // timestamp
  gitBranch?: string;
}

export async function getWorkspaceStats(workspacePath: string): Promise<WorkspaceStats | null> {
  try {
    if (!(await pathExists(workspacePath))) return null;

    const stats = await stat(workspacePath);
    const lastModified = stats.mtimeMs;

    // Get git branch if available (don't fail if not a git repo)
    let gitBranch: string | undefined;
    try {
      const { stdout } = await exec(`git -C "${workspacePath}" rev-parse --abbrev-ref HEAD`);
      gitBranch = stdout.trim();
    } catch {
      // Not a git repo or git not available
    }

    // Get file count and size (limit recursion to avoid performance issues)
    const { fileCount, size } = await getDirectoryInfo(workspacePath, 3);

    return {
      size,
      fileCount,
      lastModified,
      gitBranch,
    };
  } catch {
    return null;
  }
}

async function getDirectoryInfo(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<{ fileCount: number; size: number }> {
  let fileCount = 0;
  let size = 0;

  if (currentDepth > maxDepth) return { fileCount, size };

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip common large directories
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") {
        continue;
      }

      const fullPath = join(dirPath, entry.name);

      try {
        if (entry.isFile()) {
          fileCount++;
          const stats = await stat(fullPath);
          size += stats.size;
        } else if (entry.isDirectory()) {
          const subInfo = await getDirectoryInfo(fullPath, maxDepth, currentDepth + 1);
          fileCount += subInfo.fileCount;
          size += subInfo.size;
        }
      } catch {
        // Skip files/dirs we can't access
        continue;
      }
    }
  } catch {
    // Can't read directory
  }

  return { fileCount, size };
}

// ----------------------------------------------
// FORMAT HELPERS
// ----------------------------------------------

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}
