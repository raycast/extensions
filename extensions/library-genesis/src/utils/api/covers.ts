import { createHash } from "node:crypto";
import { extname, join } from "node:path";

import { MAX_COVER_BYTES, getCachedCoverFile, retainCoverCacheFiles, saveCoverFile } from "./cover-cache";
import { CoverSecurityError, coverDispatcher, validateCoverUrl } from "./cover-security";
import { LIBGEN_USER_AGENT } from "./request";

export { MAX_COVER_BYTES } from "./cover-cache";

const MAX_CONCURRENT_DOWNLOADS = 4;
let activeDownloads = 0;
const waitingDownloads: (() => void)[] = [];

const readCover = async (response: Response, signal: AbortSignal): Promise<Buffer> => {
  const sizeError = () => new Error("The cover image exceeds the 5 MiB size limit.");
  if (Number(response.headers.get("content-length")) > MAX_COVER_BYTES) {
    await response.body?.cancel();
    throw sizeError();
  }
  if (!response.body) throw new Error("The mirror returned an empty cover image.");

  const reader = response.body.getReader();
  let content = Buffer.alloc(0);
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > MAX_COVER_BYTES - bytes) throw sizeError();
      const required = bytes + value.byteLength;
      if (required > content.length) {
        const capacity = Math.min(MAX_COVER_BYTES, Math.max(65536, content.length * 2, required));
        const larger = Buffer.allocUnsafe(capacity);
        content.copy(larger, 0, 0, bytes);
        content = larger;
      }
      content.set(value, bytes);
      bytes += value.byteLength;
    }
    if (bytes === 0) throw new Error("The mirror returned an empty cover image.");
    return content.subarray(0, bytes);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
};

const fetchCover = async (initialUrl: URL, signal: AbortSignal, preferredMirror?: string): Promise<Response> => {
  let url = initialUrl;
  for (let redirects = 0; redirects <= 5; redirects++) {
    signal.throwIfAborted();
    const response = await fetch(url, {
      headers: {
        "User-Agent": LIBGEN_USER_AGENT,
        Referer: `${url.origin}/index.php`,
      },
      signal,
      redirect: "manual",
      dispatcher: coverDispatcher as unknown as NonNullable<Parameters<typeof fetch>[1]>["dispatcher"],
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || redirects === 5) throw new Error("The cover redirect could not be followed.");
    url = validateCoverUrl(new URL(location, url).toString(), preferredMirror);
  }
  throw new Error("The cover redirect could not be followed.");
};

const getFullSizeCoverUrl = (coverUrl: URL): URL => {
  const url = new URL(coverUrl.toString());
  url.pathname = url.pathname.replace(/_small(\.(?:jpe?g|png|gif|webp))$/i, "$1");
  return url;
};

const getCoverFilename = (url: URL): string => {
  const extension = extname(url.pathname).toLowerCase();
  const imageExtension = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extension) ? extension : ".jpg";
  return `${createHash("sha256").update(url.toString()).digest("hex")}${imageExtension}`;
};

export const retainBookCoverCache = (
  coverUrls: string[],
  cacheDirectory: string,
  preferredMirror?: string,
): (() => Promise<void>) => {
  const filenames: string[] = [];
  for (const value of new Set(coverUrls)) {
    try {
      const url = validateCoverUrl(value, preferredMirror);
      filenames.push(getCoverFilename(url), getCoverFilename(getFullSizeCoverUrl(url)));
    } catch {
      // Invalid or missing covers are rejected by the loader and need no cache protection.
    }
  }
  return retainCoverCacheFiles(join(cacheDirectory, "covers"), filenames);
};

export const getCachedBookCover = async (
  coverUrl: string,
  cacheDirectory: string,
  signal?: AbortSignal,
  preferredMirror?: string,
): Promise<string> => {
  const url = validateCoverUrl(coverUrl, preferredMirror);
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
    const directory = join(cacheDirectory, "covers");
    const filename = getCoverFilename(url);
    const path = join(directory, filename);
    if (await getCachedCoverFile(directory, filename, signal)) return path;

    const requestSignal = AbortSignal.any([AbortSignal.timeout(10000), ...(signal ? [signal] : [])]);
    const response = await fetchCover(url, requestSignal, preferredMirror);
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
      await response.body?.cancel();
      throw new Error("The mirror did not return a cover image.");
    }
    const content = await readCover(response, requestSignal);
    signal?.throwIfAborted();

    await saveCoverFile(directory, filename, content, signal);
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
  preferredMirror?: string,
): Promise<string> => {
  const url = validateCoverUrl(coverUrl, preferredMirror);
  const fullSizeUrl = getFullSizeCoverUrl(url).toString();
  try {
    return await getCachedBookCover(fullSizeUrl, cacheDirectory, signal, preferredMirror);
  } catch (error) {
    if (
      signal?.aborted ||
      fullSizeUrl === url.toString() ||
      error instanceof CoverSecurityError ||
      (error as Error & { cause?: unknown }).cause instanceof CoverSecurityError
    )
      throw error;
    return getCachedBookCover(coverUrl, cacheDirectory, signal, preferredMirror);
  }
};
