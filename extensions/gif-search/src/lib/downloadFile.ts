import { getPreferenceValues } from "@raycast/api";
import { closeSync, copyFileSync, createWriteStream, existsSync, openSync } from "fs";
import { rm } from "fs/promises";
import { homedir } from "os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import path from "path";

import { IGif } from "../models/gif";
import { CacheableService, getCacheKey, getDisplayName, getFileExtension, getGifFromCache } from "./cachedGifs";

const { downloadPath } = getPreferenceValues();
const basePath = downloadPath || `${homedir()}/Downloads`;

export default async function downloadFile(gif: IGif, service: CacheableService | null) {
  const displayName = getDisplayName(gif);
  const cacheKey = service ? getCacheKey(gif, service) : null;

  // Check if the file exists in the cache - if so use it directly
  if (cacheKey) {
    const cachedFile = await getGifFromCache(cacheKey);
    if (cachedFile) {
      try {
        return await writeToNewFile(displayName, (destination) => copyFileSync(cachedFile, destination));
      } catch (error) {
        // The entry was evicted while we were copying it; downloading still works.
        if (existsSync(cachedFile)) {
          throw error;
        }
      }
    }
  }

  // If the file is not found in the cache, download it
  const response = await fetch(gif.download_url);

  if (!response.ok) {
    throw new Error(`GIF file download failed. Server responded with ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Unable to read GIF response");
  }

  const body = Readable.fromWeb(response.body as WebReadableStream);
  // pipeline propagates errors from the response stream as well as the file stream; a bare
  // pipe() leaves the download hanging forever when the network drops mid-transfer.
  return writeToNewFile(displayName, (destination) => pipeline(body, createWriteStream(destination)));
}

/**
 * Claims an unused filename in the download folder and writes to it, so a download can never
 * overwrite an existing file. The name is claimed by creating it exclusively rather than by
 * testing for absence, because two downloads of the same GIF would otherwise both see the name
 * as free and write to it. A failed write takes the file it claimed with it.
 */
async function writeToNewFile(displayName: string, write: (destination: string) => void | Promise<void>) {
  const extension = getFileExtension(displayName);
  const stem = displayName.endsWith(extension) ? displayName.slice(0, -extension.length) || "gif" : displayName;

  let destination = "";
  let handle = -1;
  for (let counter = 0; !destination; counter++) {
    const candidate = path.join(basePath, counter === 0 ? displayName : `${stem} (${counter})${extension}`);
    try {
      handle = openSync(candidate, "wx");
      // Claimed before anything else can fail, so cleanup below always covers it.
      destination = candidate;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") {
        throw e;
      }
    }
  }

  try {
    closeSync(handle);
    await write(destination);
  } catch (error) {
    // Never let a cleanup failure replace the error that caused it.
    await rm(destination, { force: true }).catch(() => undefined);
    throw error;
  }
  return destination;
}
