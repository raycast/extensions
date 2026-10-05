import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { LIBGEN_USER_AGENT } from "./request";

const MAX_CONCURRENT_DOWNLOADS = 4;
let activeDownloads = 0;
const waitingDownloads: (() => void)[] = [];

export const getFullSizeCoverUrl = (coverUrl: string): string => {
  if (coverUrl === "N/A") return coverUrl;
  const url = new URL(coverUrl);
  url.pathname = url.pathname.replace(/_small(\.(?:jpe?g|png|gif|webp))$/i, "$1");
  return url.toString();
};

export const getCachedBookCover = async (
  coverUrl: string,
  cacheDirectory: string,
  signal?: AbortSignal,
): Promise<string> => {
  await new Promise<void>((resolve) => {
    if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
      activeDownloads++;
      resolve();
    } else {
      waitingDownloads.push(resolve);
    }
  });

  try {
    signal?.throwIfAborted();
    const url = new URL(coverUrl);
    const extension = extname(url.pathname).toLowerCase();
    const imageExtension = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extension) ? extension : ".jpg";
    const directory = join(cacheDirectory, "covers");
    const filename = `${createHash("sha256").update(url.toString()).digest("hex")}${imageExtension}`;
    const path = join(directory, filename);
    const cached = await stat(path).catch(() => undefined);
    if (cached?.isFile() && cached.size > 0) return path;

    const requestSignal = AbortSignal.any([AbortSignal.timeout(10000), ...(signal ? [signal] : [])]);
    const response = await fetch(url, {
      headers: {
        "User-Agent": LIBGEN_USER_AGENT,
        Referer: `${url.origin}/index.php`,
      },
      signal: requestSignal,
    });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
      throw new Error("The mirror did not return a cover image.");
    }
    const content = await response.arrayBuffer();
    if (content.byteLength === 0) throw new Error("The mirror returned an empty cover image.");
    signal?.throwIfAborted();

    await mkdir(directory, { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, Buffer.from(content));
      signal?.throwIfAborted();
      await rename(temporaryPath, path);
    } finally {
      await rm(temporaryPath, { force: true });
    }
    return path;
  } finally {
    const next = waitingDownloads.shift();
    if (next) next();
    else activeDownloads--;
  }
};

export const getCachedFullSizeBookCover = async (
  coverUrl: string,
  cacheDirectory: string,
  signal?: AbortSignal,
): Promise<string> => {
  const fullSizeUrl = getFullSizeCoverUrl(coverUrl);
  try {
    return await getCachedBookCover(fullSizeUrl, cacheDirectory, signal);
  } catch (error) {
    if (signal?.aborted || fullSizeUrl === coverUrl) throw error;
    return getCachedBookCover(coverUrl, cacheDirectory, signal);
  }
};
