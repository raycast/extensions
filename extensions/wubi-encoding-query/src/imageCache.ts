import { environment } from "@raycast/api";
import fetch from "node-fetch";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(environment.supportPath, "wubi_images");

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

export async function downloadAndCacheImage(
  hanzi: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const filename = `${hanzi}.png`;
    const localPath = join(CACHE_DIR, filename);

    // Check if already cached
    if (existsSync(localPath)) {
      return localPath;
    }

    // Download image
    const response = await fetch(imageUrl, {
      headers: {
        Referer: "https://www.iamwawa.cn/wubi.html",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.buffer();
    writeFileSync(localPath, new Uint8Array(buffer));

    return localPath;
  } catch (error) {
    console.error("Failed to download image:", error);
    return null;
  }
}

export function getLocalImagePath(hanzi: string): string | null {
  const filename = `${hanzi}.png`;
  const localPath = join(CACHE_DIR, filename);
  return existsSync(localPath) ? localPath : null;
}
