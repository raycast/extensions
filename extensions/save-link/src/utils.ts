import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

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
  return title.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50);
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
