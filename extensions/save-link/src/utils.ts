import { Clipboard, showHUD } from "@raycast/api";
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Configuration
const MAX_CACHE_FILES = 20; // Maximum number of webloc files to keep in cache

// Types
export interface WeblocFileOptions {
  url: string;
  customTitle?: string;
  fallbackTitle?: string;
  titleSource?: string;
}

// Function to create webloc file content
export function createWeblocContent(url: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>${url}</string>
</dict>
</plist>`;
}

// Function to create a safe filename
export function createSafeFilename(title: string): string {
  return title
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

// Function to ensure cache directory exists
export function ensureCacheDirectory(): string {
  const cacheDir = join(homedir(), "Library", "Caches", "com.raycast.save-link");
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    // Directory might already exist, that's fine
  }
  return cacheDir;
}

// Function to validate if a string is a valid URL
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Function to extract URLs from text
export function extractUrlFromText(text: string): string | null {
  // First try to validate the entire text as a URL
  if (isValidUrl(text.trim())) {
    return text.trim();
  }

  // If not, look for URLs in the text using regex
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);

  if (matches && matches.length > 0) {
    // Return the first valid URL found
    for (const match of matches) {
      if (isValidUrl(match)) {
        return match;
      }
    }
  }

  return null;
}

// Function to extract domain name from URL
export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "Link";
  }
}

// Function to clean up old cache files, keeping only the most recent ones
export function cleanupOldCacheFiles(cacheDir: string, maxFiles: number = 20): void {
  try {
    const files = readdirSync(cacheDir)
      .filter((file) => file.endsWith(".webloc"))
      .map((file) => {
        const filePath = join(cacheDir, file);
        return {
          name: file,
          path: filePath,
          mtime: statSync(filePath).mtime,
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by modification time, newest first

    // If we have more files than the limit, remove the oldest ones
    if (files.length > maxFiles) {
      const filesToRemove = files.slice(maxFiles);
      for (const file of filesToRemove) {
        try {
          unlinkSync(file.path);
        } catch (error) {
          // Ignore errors when deleting files (file might be in use, etc.)
          console.warn(`Failed to delete cache file ${file.name}:`, error);
        }
      }
    }
  } catch (error) {
    // Ignore errors during cleanup - it's not critical
    console.warn("Failed to cleanup cache files:", error);
  }
}

// Main function to create and copy webloc file
export async function createAndCopyWeblocFile(options: WeblocFileOptions): Promise<void> {
  const { url, customTitle, fallbackTitle = "Link", titleSource = "default" } = options;

  // Create cache directory
  const cacheDir = ensureCacheDirectory();

  // Determine the title to use
  const titleToUse = customTitle || fallbackTitle;
  const safeTitle = createSafeFilename(titleToUse);
  const filename = `${safeTitle || "Link"}.webloc`;
  const filePath = join(cacheDir, filename);

  // Create the webloc file content
  const weblocContent = createWeblocContent(url);

  // Write the webloc file
  try {
    writeFileSync(filePath, weblocContent, "utf8");
  } catch (error) {
    throw new Error(`Failed to create webloc file: ${error}`);
  }

  // Clean up old cache files to prevent accumulation
  cleanupOldCacheFiles(cacheDir, MAX_CACHE_FILES);

  // Copy the file to clipboard
  const fileContent: Clipboard.Content = { file: filePath };
  await Clipboard.copy(fileContent);

  // Show success message
  const source = customTitle ? "custom title" : titleSource;
  await showHUD(`📋 Copied "${safeTitle}.webloc" to clipboard (using ${source})`);
}
