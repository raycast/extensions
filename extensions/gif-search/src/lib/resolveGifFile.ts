import { accessSync, constants, copyFileSync, existsSync, statSync } from "fs";
import path from "path";
import tempy from "tempy";

import { IGif } from "../models/gif";
import {
  CacheableService,
  getCacheKey,
  getDisplayName,
  getGifFromCache,
  removeCacheEntry,
  saveGifToCache,
} from "./cachedGifs";
import { isSavedNow } from "./localGifs";

export default async function resolveGifFile(gif: IGif, service: CacheableService | null) {
  const displayName = getDisplayName(gif);
  // Without a resolved provider there is no safe cache identity, so skip the cache entirely
  // rather than sharing one namespace between providers.
  const cacheKey = service ? getCacheKey(gif, service) : null;

  if (cacheKey) {
    const staged = await stageFromCache(cacheKey, displayName);
    if (staged) {
      return verifyGifFile(staged);
    }
  }

  // Download the file if it's not found in the cache
  let response: Response;
  try {
    response = await fetch(gif.download_url);
  } catch (error) {
    throw new Error("Failed to download GIF", { cause: error });
  }

  if (response.status !== 200) {
    throw new Error(`GIF file download failed. Server responded with ${response.status}`);
  }

  if (response.body === null) {
    throw new Error("Unable to read GIF response");
  }

  let file: string;
  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    file = await tempy.write(buffer, { name: displayName });
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download GIF: "${error.message}"`);
  }

  if (cacheKey && service) {
    await cacheIfStillFavorite(file, cacheKey, gif, service);
  }

  return verifyGifFile(file);
}

/**
 * Caching is an optimisation, so a failure here must not fail the operation the user asked for.
 * Membership is re-read rather than passed in, because the GIF can leave Favorites while the
 * download above is in flight — a stale flag would recreate the entry that removal just evicted.
 */
async function cacheIfStillFavorite(file: string, cacheKey: string, gif: IGif, service: CacheableService) {
  try {
    if (await isSavedNow(gif, service, "favs")) {
      await saveGifToCache(file, cacheKey);
    }
  } catch (error) {
    console.error(`Failed to cache GIF: ${cacheKey}`, error);
  }
}

/**
 * Copies a cached GIF to a temp file named for display, so the clipboard gets an absolute path
 * with the filename the user expects. Returns null when the cache cannot serve this GIF.
 */
async function stageFromCache(cacheKey: string, displayName: string) {
  const cachedFile = await getGifFromCache(cacheKey);
  if (!cachedFile) {
    return null;
  }

  // A cache entry we cannot read is a miss we can recover from by downloading. A problem
  // writing the staged copy is not — a full disk must not be reported as a cache miss.
  try {
    accessSync(cachedFile, constants.R_OK);
  } catch {
    await removeCacheEntry(cacheKey);
    return null;
  }

  const staged = tempy.file({ name: displayName });
  try {
    copyFileSync(cachedFile, staged);
  } catch (error) {
    if (!existsSync(cachedFile)) {
      await removeCacheEntry(cacheKey);
      return null;
    }
    throw error;
  }
  return staged;
}

function verifyGifFile(file: string) {
  if (!path.isAbsolute(file) || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
    throw new Error("Resolved GIF file is missing or its path is not absolute");
  }
  accessSync(file, constants.R_OK);
  return file;
}
