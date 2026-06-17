import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { Icon } from "@raycast/api";

const execAsync = promisify(exec);

let ffprobePath: string | null | undefined;

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  created: Date;
  modified: Date;
  accessed: Date;
  permissions: string;
  owner: string;
  group: string;
  isDirectory: boolean;
  mimeType?: string;
  dimensions?: string;
  duration?: string;
}

/**
 * Find ffprobe executable by checking common installation paths
 */
async function findFfprobe(): Promise<string | null> {
  if (ffprobePath !== undefined) {
    return ffprobePath;
  }

  // Common paths where ffprobe might be installed
  const commonPaths = [
    "/opt/homebrew/bin/ffprobe", // Homebrew on Apple Silicon
    "/usr/local/bin/ffprobe", // Homebrew on Intel
    "/opt/local/bin/ffprobe", // MacPorts
    "/usr/bin/ffprobe", // System install
  ];

  // Try to use 'which' command first (respects user's PATH)
  try {
    const { stdout } = await execAsync("which ffprobe", {
      env: {
        ...process.env,
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
      },
    });
    const foundPath = stdout.trim();
    if (foundPath) {
      ffprobePath = foundPath;
      return ffprobePath;
    }
  } catch {
    // 'which' didn't find it, continue to check common paths
  }

  // Check common paths manually
  for (const testPath of commonPaths) {
    try {
      await fs.access(testPath, fs.constants.X_OK);
      ffprobePath = testPath;
      return ffprobePath;
    } catch {
      // Path doesn't exist or isn't executable, continue
    }
  }

  // Not found
  ffprobePath = null;
  return null;
}

/**
 * Get comprehensive file information including metadata, dimensions, and duration
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const stats = await fs.stat(filePath);
  const parsedPath = path.parse(filePath);

  // Get file owner/group info
  let owner = "";
  let group = "";
  try {
    const { stdout } = await execAsync(`ls -ld "${filePath}"`);
    const parts = stdout.trim().split(/\s+/);
    if (parts.length >= 4) {
      owner = parts[2];
      group = parts[3];
    }
  } catch {
    // Ignore errors
  }

  // Get MIME type
  let mimeType = "";
  try {
    const { stdout } = await execAsync(`file --mime-type -b "${filePath}"`);
    mimeType = stdout.trim();
  } catch {
    // Ignore errors
  }

  let dimensions = "";
  let duration = "";
  const ext = parsedPath.ext.toLowerCase();

  // Check if it's an image
  if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".heic"].includes(ext)) {
    try {
      const { stdout } = await execAsync(`sips -g pixelWidth -g pixelHeight "${filePath}"`);
      const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/);
      const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/);
      if (widthMatch && heightMatch) {
        dimensions = `${widthMatch[1]} × ${heightMatch[1]}`;
      }
    } catch {
      // Ignore errors
    }
  }

  // Check if it's a video, support major formats
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".flv", ".wmv", ".mpg", ".mpeg"].includes(ext)) {
    const ffprobe = await findFfprobe();

    // Try to get dimensions with ffprobe
    if (ffprobe) {
      try {
        const { stdout } = await execAsync(
          `"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`,
        );
        const trimmed = stdout.trim();
        if (trimmed?.includes("x")) {
          dimensions = trimmed.replace("x", " × ");
        }
      } catch {
        // ffprobe failed, will try fallback below
      }
    }

    // Try mdls as fallback for dimensions if ffprobe didn't work
    if (!dimensions) {
      try {
        const { stdout } = await execAsync(`mdls -name kMDItemPixelWidth -name kMDItemPixelHeight "${filePath}"`);
        const widthMatch = stdout.match(/kMDItemPixelWidth\s*=\s*(\d+)/);
        const heightMatch = stdout.match(/kMDItemPixelHeight\s*=\s*(\d+)/);
        if (widthMatch && heightMatch) {
          dimensions = `${widthMatch[1]} × ${heightMatch[1]}`;
        }
      } catch {
        // Ignore errors
      }
    }

    // Try to get duration with ffprobe first
    if (ffprobe) {
      try {
        const { stdout } = await execAsync(
          `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        );
        const seconds = Number.parseFloat(stdout.trim());
        if (!Number.isNaN(seconds)) {
          duration = formatDuration(seconds);
        }
      } catch {
        // ffprobe failed, will try fallback below
      }
    }

    // Try mdls as fallback for duration if ffprobe didn't work
    if (!duration) {
      try {
        const { stdout } = await execAsync(`mdls -name kMDItemDurationSeconds "${filePath}"`);
        const match = stdout.match(/kMDItemDurationSeconds\s*=\s*([\d.]+)/);
        if (match) {
          const seconds = Number.parseFloat(match[1]);
          if (!Number.isNaN(seconds)) {
            duration = formatDuration(seconds);
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }

  // Check if it's an audio file
  if ([".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg", ".wma", ".opus"].includes(ext)) {
    const ffprobe = await findFfprobe();

    // Try ffprobe first
    if (ffprobe) {
      try {
        const { stdout } = await execAsync(
          `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        );
        const seconds = Number.parseFloat(stdout.trim());
        if (!Number.isNaN(seconds)) {
          duration = formatDuration(seconds);
        }
      } catch {
        // ffprobe failed, will try fallback below
      }
    }

    // Try afinfo as fallback if ffprobe didn't work (works for many audio formats on macOS)
    if (!duration) {
      try {
        const { stdout } = await execAsync(`afinfo "${filePath}"`);
        const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
        if (match) {
          const seconds = Number.parseFloat(match[1]);
          if (!Number.isNaN(seconds)) {
            duration = formatDuration(seconds);
          }
        }
      } catch {
        // afinfo failed, try mdls
      }
    }

    // Try mdls as another fallback if afinfo didn't work
    if (!duration) {
      try {
        const { stdout } = await execAsync(`mdls -name kMDItemDurationSeconds "${filePath}"`);
        const match = stdout.match(/kMDItemDurationSeconds\s*=\s*([\d.]+)/);
        if (match) {
          const seconds = Number.parseFloat(match[1]);
          if (!Number.isNaN(seconds)) {
            duration = formatDuration(seconds);
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }

  return {
    name: parsedPath.base,
    path: filePath,
    size: stats.size,
    type: stats.isDirectory() ? "Directory" : "File",
    extension: parsedPath.ext || "None",
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    permissions: stats.mode.toString(8).slice(-3),
    owner,
    group,
    isDirectory: stats.isDirectory(),
    mimeType,
    dimensions,
    duration,
  };
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format bytes to human-readable size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / k ** i) * 100) / 100 + " " + sizes[i];
}

/**
 * Format date to human-readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Get appropriate icon for file type
 */
export function getFileIcon(fileInfo: FileInfo): Icon {
  if (fileInfo.isDirectory) return Icon.Folder;

  const ext = fileInfo.extension.toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"].includes(ext)) return Icon.Image;
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) return Icon.Video;
  if ([".mp3", ".wav", ".aac", ".flac", ".m4a"].includes(ext)) return Icon.Music;
  if ([".pdf"].includes(ext)) return Icon.Document;
  if ([".txt", ".md", ".rtf"].includes(ext)) return Icon.Text;
  if ([".zip", ".tar", ".gz", ".rar", ".7z"].includes(ext)) return Icon.Box;
  if ([".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".c", ".cpp", ".swift", ".go", ".rs"].includes(ext))
    return Icon.Code;

  return Icon.Document;
}
