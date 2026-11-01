import { readdir, readFile, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { Instance } from "./instance";
import { listInstances } from "./lima";

/** Where Lima keeps what it downloads: one folder per URL, named after the URL's SHA-256. */
export const CACHE_DIR = join(homedir(), "Library", "Caches", "lima", "download", "by-url-sha256");

/** A disk image or an archive Lima downloaded once, so instances made from it later don't download it again. */
export interface CachedFile {
  /** The entry's folder in the cache. */
  dir: string;
  url: string;
  /** The file name at the end of the URL: "ubuntu-24.04-server-cloudimg-arm64.img". */
  name: string;
  kind: "image" | "archive";
  /** Bytes it takes on disk, the converted copy included, as du counts them. */
  bytes: number;
  /** When it was downloaded. */
  downloaded?: Date;
  /** Instances whose configuration names this URL. */
  usedBy: string[];
}

/** Bytes a folder and everything under it take on disk. Images are sparse, so their nominal size says more than they take. */
async function folderSize(path: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) total += await folderSize(full);
    else if (entry.isFile()) total += (await stat(full)).blocks * 512;
  }
  return total;
}

/** The URLs each instance can boot from or installs, from its configuration. */
function referredUrls(instances: Instance[]): Map<string, string[]> {
  const users = new Map<string, string[]>();
  for (const instance of instances) {
    const urls = [
      ...(instance.config?.images ?? []).map((image) => image.location),
      ...(instance.config?.containerd?.archives ?? []).map((archive) => archive.location),
    ];
    for (const url of new Set(urls)) users.set(url, [...(users.get(url) ?? []), instance.name]);
  }
  return users;
}

/** Everything in Lima's download cache, biggest first. A cache that doesn't exist yet is empty. */
export async function listCache(): Promise<CachedFile[]> {
  let names: string[];
  try {
    names = await readdir(CACHE_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const users = referredUrls(await listInstances());
  const entries = await Promise.all(
    names.map(async (hash): Promise<CachedFile | undefined> => {
      const dir = join(CACHE_DIR, hash);
      let url: string;
      try {
        url = (await readFile(join(dir, "url"), "utf8")).trim();
      } catch {
        // A download that never finished has no url file. It's still taking space, so it's listed.
        url = "";
      }
      const name = url ? basename(url.split(/[?#]/)[0]) : `Unfinished download ${hash.slice(0, 8)}`;
      let downloaded: Date | undefined;
      try {
        downloaded = (await stat(join(dir, "data"))).birthtime;
      } catch {
        downloaded = undefined;
      }
      return {
        dir,
        url,
        name,
        kind: /\.(tar\.gz|tgz|tar)$/.test(name) ? "archive" : "image",
        bytes: await folderSize(dir),
        downloaded,
        usedBy: users.get(url) ?? [],
      };
    }),
  );
  return entries.filter((entry): entry is CachedFile => !!entry).sort((a, b) => b.bytes - a.bytes);
}

/** Deletes one entry. Only ever a folder straight under CACHE_DIR, named like Lima names them. */
export async function deleteCached(file: CachedFile): Promise<void> {
  if (join(CACHE_DIR, basename(file.dir)) !== file.dir || !/^[0-9a-f]{64}$/.test(basename(file.dir))) {
    throw new Error(`${file.dir} isn't in Lima's cache`);
  }
  await rm(file.dir, { recursive: true, force: true });
}

export function totalBytes(files: CachedFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}
