import { environment } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { getApiConfig } from "./config";
import { describeConnectionError, getConnectionErrorCode, isConnectionError } from "./connection";

const log = logger.child("[Screenshot]");

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
        } catch (error) {
          // Ignore races with other preview loads or user cleanup.
          log.log("Could not sweep cache entry", { entry, error });
        }
      }),
    );
  } catch (error) {
    // Cache cleanup should never block preview loading.
    log.log("Cache sweep skipped", { error });
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
      // cache miss — the common path on a first load, not worth logging
    }
  }

  let response: Response;
  try {
    response = await fetch(imageUrl, {
      headers: {
        Accept: "image/png,image/jpeg;q=0.9,*/*;q=0.1",
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    // Previews fail silently into a placeholder, so without this a stopped
    // server looks identical to a bookmark that simply has no screenshot.
    if (isConnectionError(error)) {
      log.error("Preview fetch could not connect", {
        assetId: id,
        errorCode: getConnectionErrorCode(error) ?? "unknown",
        detail: describeConnectionError(error, apiUrl),
      });
    } else {
      log.error("Preview fetch failed", { assetId: id, error });
    }
    throw error;
  }

  if (!response.ok) {
    // Log the body rather than interpolating it into the message — this
    // endpoint answers with a full HTML error page, not JSON.
    const body = await response.text();
    log.error("Preview request rejected", { assetId: id, status: response.status, body: body.slice(0, 500) });
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    log.error("Preview response was not an image", { assetId: id, contentType });
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
