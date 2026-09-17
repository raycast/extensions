import { createHash } from "crypto";
import { environment } from "@raycast/api";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

import { IGif } from "../models/gif";
import { ServiceName } from "../preferences";
import { getHideFilename } from "../preferences";

const cachedGifsDir = path.join(environment.supportPath, "cached-gifs");

/**
 * A GIF provider. Excludes the aggregate views, which are not providers: a GIF shown under
 * Favorites or Recents still belongs to the service it came from, and keying on the view would
 * give the same GIF two different cache entries.
 */
export type CacheableService = Exclude<ServiceName, "favorites" | "recents">;

export function isCacheableService(service: ServiceName | null): service is CacheableService {
  return service !== null && service !== "favorites" && service !== "recents";
}

/**
 * The extension of a download name, including the leading dot.
 * `path.extname` returns "" for a name that is nothing but an extension (".mp4"), which the
 * models produce whenever a title slugifies to empty — an emoji-only title, for instance.
 */
export function getFileExtension(downloadName: string) {
  const dot = downloadName.lastIndexOf(".");
  const extension = dot === -1 ? "" : downloadName.slice(dot);
  return extension.length > 1 ? extension : ".gif";
}

/**
 * The name the GIF is presented under — on the clipboard and in the download folder.
 * This is a display concern and must never be used as cache identity.
 * @param extension Overrides the extension, for actions that re-encode to another format.
 */
export function getDisplayName(gif: Pick<IGif, "download_name">, extension = getFileExtension(gif.download_name)) {
  if (getHideFilename()) {
    return `gif${extension}`;
  }

  const downloadName = gif.download_name;
  const currentExtension = getFileExtension(downloadName);
  const stem = downloadName.endsWith(currentExtension) ? downloadName.slice(0, -currentExtension.length) : downloadName;
  return `${stem || "gif"}${extension}`;
}

/**
 * The cache filename for a GIF, derived from provider identity rather than its display name.
 * IDs are only unique within a provider, and are hashed because some providers use raw
 * filesystem-unsafe strings. The extension is kept so a GIPHY Clip's MP4 is never served as
 * a GIF.
 */
export function getCacheKey(gif: Pick<IGif, "id" | "download_name">, service: CacheableService) {
  return `${getCacheDigest(gif, service)}${getFileExtension(gif.download_name)}`;
}

function getCacheDigest(gif: Pick<IGif, "id">, service: CacheableService) {
  return createHash("sha1").update(`${service}:${gif.id}`).digest("hex");
}

/**
 * Removes every cached format of a GIF. A provider can switch a GIF between formats — GIPHY
 * serves a Clip as an MP4 or falls back to a GIF depending on the renditions available — so
 * evicting only the format the item currently reports would leave the other behind.
 */
export async function removeGifFromCache(gif: Pick<IGif, "id">, service: CacheableService) {
  if (!existsSync(cachedGifsDir)) {
    return;
  }

  const digest = getCacheDigest(gif, service);
  const variants = readdirSync(cachedGifsDir).filter((entry) => entry.startsWith(digest));
  await Promise.all(variants.map((variant) => removeCacheEntry(variant)));
}

/**
 * Removes a single cache entry by filename.
 * @param cacheKey The cache filename to remove, from `getCacheKey`.
 */
export async function removeCacheEntry(cacheKey: string) {
  const cachedFilePath = path.join(cachedGifsDir, cacheKey);
  if (existsSync(cachedFilePath)) {
    try {
      await rm(cachedFilePath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to remove cached GIF: ${cacheKey}`, error);
    }
  }
}

/**
 * Retrieves a GIF from the cache directory if it exists.
 * Anything at that name that is not a regular file is a corrupt entry, not a hit — serving it
 * would fail the copy with an errno that varies by platform and by which side is at fault.
 * @param cacheKey The cache filename of the GIF to fetch, from `getCacheKey`.
 */
export async function getGifFromCache(cacheKey: string) {
  const cachedFilePath = path.join(cachedGifsDir, cacheKey);
  if (statSync(cachedFilePath, { throwIfNoEntry: false })?.isFile()) {
    return cachedFilePath;
  }
  return null;
}

/**
 * Saves a GIF to the cache directory.
 * @param file The file to save to the cache.
 * @param cacheKey The cache filename to save the file as, from `getCacheKey`.
 */
export async function saveGifToCache(file: string, cacheKey: string) {
  // Ensure the cache directory exists
  if (!existsSync(cachedGifsDir)) {
    mkdirSync(cachedGifsDir, { recursive: true });
  }

  const cachedFilePath = path.join(cachedGifsDir, cacheKey);
  // Clear a corrupt entry rather than failing against it on every future copy.
  if (existsSync(cachedFilePath) && !statSync(cachedFilePath).isFile()) {
    await rm(cachedFilePath, { recursive: true, force: true });
  }
  return copyFileSync(file, cachedFilePath);
}
