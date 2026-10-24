import { environment } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { writeFileAtomic } from "./atomic-file";

import type { ContextSnippet } from "./types";

/**
 * Cached library payloads live on disk, not in LocalStorage: at the 25,000-token budget a
 * library is roughly 64 KB, which is far past what LocalStorage is meant to hold. The
 * manifest in `my-libraries.ts` stays small and keeps the metadata.
 */
const CACHE_DIRECTORY = join(environment.supportPath, "library-cache");

/** Big enough for local search to find things; small enough that fifty libraries cost ~3 MB. */
export const LIBRARY_TOKEN_BUDGET = 25_000;

export interface CachedLibrary {
  libraryId: string;
  cachedAt: string;
  snippets: ContextSnippet[];
}

/**
 * Library IDs contain slashes (`/vercel/next.js`), so they are percent-encoded into one flat
 * filename. Encoding can multiply length by three, and most filesystems cap a name at 255
 * bytes, so anything near the limit falls back to a hash rather than throwing ENAMETOOLONG.
 */
const MAX_FILENAME_LENGTH = 200;

function cacheFilePath(libraryId: string) {
  const encoded = encodeURIComponent(libraryId);
  const name = encoded.length <= MAX_FILENAME_LENGTH ? encoded : createHash("sha256").update(libraryId).digest("hex");

  return join(CACHE_DIRECTORY, `${name}.json`);
}

export async function writeCachedLibrary(libraryId: string, snippets: ContextSnippet[]) {
  const cached: CachedLibrary = { libraryId, cachedAt: new Date().toISOString(), snippets };
  await writeFileAtomic(cacheFilePath(libraryId), JSON.stringify(cached));
  logger.log("Cached library", { libraryId, snippets: snippets.length });

  return cached;
}

/**
 * When a library's payload was last written, read from the file itself rather than duplicated
 * into the manifest. Duplicating it meant a refresh in one command process could write back a
 * manifest it had read before another process removed the library — resurrecting the entry.
 * The cache file is the single source of truth for its own freshness, so that race is gone.
 */
export async function readCachedAt(libraryId: string) {
  try {
    return (await stat(cacheFilePath(libraryId))).mtime.toISOString();
  } catch {
    return undefined;
  }
}

export async function readCachedLibrary(libraryId: string): Promise<CachedLibrary | undefined> {
  try {
    const raw = await readFile(cacheFilePath(libraryId), "utf8");
    const parsed = JSON.parse(raw) as CachedLibrary;

    return Array.isArray(parsed?.snippets) ? parsed : undefined;
  } catch (error) {
    // A missing file is the normal "not cached yet" path, not a failure worth surfacing.
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      logger.error("Could not read cached library", error);
    }

    return undefined;
  }
}

export async function removeCachedLibrary(libraryId: string) {
  await rm(cacheFilePath(libraryId), { force: true });
  logger.log("Removed cached library", { libraryId });
}

/** Drops payloads whose manifest entry is gone, so a failed removal cannot leak disk forever. */
export async function pruneCachedLibraries(keepLibraryIds: string[]) {
  const keep = new Set(keepLibraryIds.map((libraryId) => cacheFilePath(libraryId).split("/").pop()));

  let entries: string[];
  try {
    entries = await readdir(CACHE_DIRECTORY);
  } catch {
    return 0;
  }

  const orphans = entries.filter((entry) => entry.endsWith(".json") && !keep.has(entry));
  await Promise.all(orphans.map((entry) => rm(join(CACHE_DIRECTORY, entry), { force: true })));

  if (orphans.length > 0) {
    logger.log("Pruned orphaned library caches", { removed: orphans.length });
  }

  return orphans.length;
}
