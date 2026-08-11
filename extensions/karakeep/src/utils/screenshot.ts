import { environment } from "@raycast/api";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { getApiConfig } from "./config";

const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const IMAGE_EXTENSIONS = ["jpg", "png", "gif", "webp", "img"];
let lastCacheSweep = 0;

function extensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("webp")) return "webp";
  return "img";
}

function cacheKeyFromAssetId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function sweepExpiredCacheEntries(imageCacheDirectory: string) {
  const now = Date.now();
  if (now - lastCacheSweep < CACHE_MAX_AGE_MS) return;
  lastCacheSweep = now;

  try {
    const entries = await readdir(imageCacheDirectory);
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(imageCacheDirectory, entry);
        try {
          const cached = await stat(entryPath);
          if (cached.isFile() && now - cached.mtimeMs > CACHE_MAX_AGE_MS) {
            await unlink(entryPath);
          }
        } catch {
          // Ignore races with other preview loads or user cleanup.
        }
      }),
    );
  } catch {
    // Cache cleanup should never block preview loading.
  }
}

export async function getScreenshot(id: string) {
  const { apiUrl, apiKey } = await getApiConfig();
  const encodedUrl = encodeURIComponent(`/api/assets/${id}`);
  const imageUrl = `${apiUrl}/_next/image?url=${encodedUrl}&w=1200&q=75`;
  const imageCacheDirectory = path.join(environment.supportPath, "preview-images");
  const cacheKey = cacheKeyFromAssetId(id);

  await mkdir(imageCacheDirectory, { recursive: true });
  void sweepExpiredCacheEntries(imageCacheDirectory);

  for (const extension of IMAGE_EXTENSIONS) {
    const cachedPath = path.join(imageCacheDirectory, `${cacheKey}.${extension}`);
    try {
      const cached = await stat(cachedPath);
      if (cached.size > 0) return cachedPath;
    } catch {
      // cache miss
    }
  }

  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/png,image/jpeg;q=0.9,*/*;q=0.1",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Expected image response, got ${contentType}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = extensionFromContentType(contentType);
  const imagePath = path.join(imageCacheDirectory, `${cacheKey}.${extension}`);
  const temporaryPath = `${imagePath}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;

  await writeFile(temporaryPath, bytes);
  await rename(temporaryPath, imagePath);
  return imagePath;
}
