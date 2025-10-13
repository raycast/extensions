import { exec } from "child_process";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";
import { WindsurfProject } from "./types";
import { saveWindsurfProject } from "./storage";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function openInWindsurf(filePath: string): Promise<boolean> {
  try {
    // Normalize and validate the path
    const normalizedPath = path.normalize(filePath);

    // Check if path exists
    if (!fs.existsSync(normalizedPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Path not found",
        message: `The path "${normalizedPath}" does not exist`,
      });
      return false;
    }

    // Determine if it's a file or folder
    const stats = fs.statSync(normalizedPath);
    const isDirectory = stats.isDirectory();

    // Open in Windsurf with proper shell escaping
    const escapedPath = normalizedPath.replace(/'/g, "'\"'\"'");
    await execAsync(`open -a "Windsurf" '${escapedPath}'`);

    // Only save folders to recent projects (not files)
    if (isDirectory) {
      const project: WindsurfProject = {
        name: path.basename(normalizedPath),
        path: normalizedPath,
        lastOpened: new Date(),
        type: "folder",
      };

      await saveWindsurfProject(project);
    }

    return true;
  } catch (error) {
    console.error("Error opening in Windsurf:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Windsurf",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

export async function checkWindsurfInstalled(): Promise<boolean> {
  try {
    await execAsync("which windsurf");
    return true;
  } catch {
    try {
      // Check if Windsurf app exists in Applications
      await execAsync("ls /Applications/Windsurf.app");
      return true;
    } catch {
      return false;
    }
  }
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
}
