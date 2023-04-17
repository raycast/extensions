import { promises as fs } from "fs";
import { existsSync } from "fs";
import { join } from "path";
import { FileTypeColors, FileTypeIcons } from "./fileTypes";

export interface Download {
  path: string;
  name: string;
  size: number;
  lastModifiedAt: Date;
}

export async function getRecentDownloads(downloadsPath: string): Promise<Download[]> {
  const files = await fs.readdir(downloadsPath);
  const downloads: Download[] = [];

  for (const file of files) {
    const path = join(downloadsPath, file);
    const stats = await fs.stat(path);
    if (!stats.isDirectory()) {
      downloads.push({
        path,
        name: file,
        size: stats.size,
        lastModifiedAt: new Date(stats.mtimeMs),
      });
    }
  }

  return downloads;
}

export function getFileTypeIcon(fileExtension: string): string {
  const iconName = FileTypeIcons[fileExtension] ?? "default";
  const iconPath = join(__dirname, "assets", "filetype-icon", `${iconName}.png`);

  if (existsSync(iconPath)) {
    return iconPath;
  } else {
    console.warn(`Icon not found for file extension: ${fileExtension}. Using default icon.`);
    const defaultIconPath = join(__dirname, "assets", "filetype-icon", "_page.png");
    return defaultIconPath;
  }
}

export function getFileTypeColor(fileExtension: string): string {
  return FileTypeColors[fileExtension] ?? "#999999";
}
