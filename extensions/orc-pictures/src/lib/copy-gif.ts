import { existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { environment } from "@raycast/api";

import { absoluteUrl, isSafeSlug, type CatalogGif } from "./catalog";

const gifFileName = (slug: string): string => {
  if (!isSafeSlug(slug)) {
    throw new Error("Invalid GIF slug");
  }

  return `${slug}.gif`;
};

const pathInside = (root: string, fileName: string): string => {
  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, fileName);
  const prefix = resolvedRoot.endsWith("/") ? resolvedRoot : `${resolvedRoot}/`;

  if (resolved !== resolvedRoot && !resolved.startsWith(prefix)) {
    throw new Error("GIF path escaped directory");
  }

  return resolved;
};

const cacheDirectory = (): string => resolve(environment.supportPath, "gifs");

const cachedGifPath = (slug: string): string => pathInside(cacheDirectory(), gifFileName(slug));

const localGifPath = (slug: string, localGifsDirectory: string | undefined): string | undefined => {
  if (!localGifsDirectory) {
    return undefined;
  }

  const path = pathInside(localGifsDirectory, gifFileName(slug));

  if (!existsSync(path)) {
    return undefined;
  }

  return path;
};

const cachedGifIfReady = async (slug: string): Promise<string | undefined> => {
  const path = cachedGifPath(slug);

  try {
    const info = await stat(path);

    if (info.size > 0) {
      return path;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const ensureLocalGif = async (gif: CatalogGif, origin: string, localGifsDirectory?: string): Promise<string> => {
  const localPath = localGifPath(gif.slug, localGifsDirectory);

  if (localPath) {
    return localPath;
  }

  const cachedPath = await cachedGifIfReady(gif.slug);

  if (cachedPath) {
    return cachedPath;
  }

  const response = await fetch(absoluteUrl(gif.file, origin));

  if (!response.ok) {
    throw new Error(`Could not download ${gif.slug}.gif`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const dest = cachedGifPath(gif.slug);

  await mkdir(cacheDirectory(), { recursive: true });
  await writeFile(dest, bytes);

  return dest;
};
