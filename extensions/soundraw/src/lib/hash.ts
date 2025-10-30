import crypto from "crypto";

/**
 * Convert a URL to a SHA-256 hash
 * @param url The URL to hash
 * @returns The hexadecimal hash string
 */
export function urlToHash(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

/**
 * Check if a URL hash exists in cache
 * @param url The URL to check
 * @param cacheFilePath Path to the cache directory
 * @returns The cached file path if it exists, null otherwise
 */
export async function getCachedFilePath(url: string, cacheFilePath: string): Promise<string | null> {
  const hash = urlToHash(url);
  const fullPath = `${cacheFilePath}/${hash}`;

  try {
    const fs = await import("fs");
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  } catch {
    // File doesn't exist or error reading
  }

  return null;
}
