import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

/**
 * Validate Instagram URL format
 */
export function validateInstagramUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/reels?\/[\w-]+\/?/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Extract video ID from Instagram URL
 */
export function extractVideoId(url: string): string {
  const match = url.match(/\/(p|reel|tv|reels?)\/([\w-]+)/);
  return match ? match[2] : "";
}

/**
 * Download Instagram video using yt-dlp
 */
export async function downloadVideo(
  url: string,
  outputDir: string,
): Promise<string> {
  // Check if yt-dlp is installed
  try {
    await execAsync("which yt-dlp");
  } catch {
    // Try to install via Homebrew if not found
    throw new Error(
      "yt-dlp not found. Please install it via Homebrew: brew install yt-dlp",
    );
  }

  const videoId = extractVideoId(url);
  const outputPath = path.join(outputDir, `${videoId}.mp4`);

  // Download video with yt-dlp
  const command = `yt-dlp -o "${outputPath}" --no-playlist --quiet --no-warnings "${url}"`;

  try {
    await execAsync(command, { timeout: 60000 }); // 60 second timeout

    // Verify file was downloaded
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    return outputPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Instagram")) {
      throw new Error(
        "Failed to download Instagram video. The video might be private or the URL is invalid.",
      );
    }
    throw new Error(`Download failed: ${errorMessage}`);
  }
}

/**
 * Alternative download method using browser automation (fallback)
 */
export async function downloadVideoWithPuppeteer(): Promise<string> {
  // This would require puppeteer setup - keeping as placeholder
  // for potential future enhancement
  throw new Error("Browser automation download not yet implemented");
}
