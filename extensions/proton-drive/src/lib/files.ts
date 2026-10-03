import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { Cache, environment, getPreferenceValues } from "@raycast/api";
import { download, DriveNode } from "./cli";

const OPEN_CACHE = join(environment.supportPath, "open");
/** Decrypted copies opened from Raycast are kept this long, so reopening is instant, then deleted. */
const OPEN_CACHE_TTL = 24 * 3600_000;

/**
 * Downloads a node into a fresh temporary folder and returns the local path.
 * The CLI does not report the resulting file name, so an empty folder per download keeps it unambiguous.
 */
async function downloadToTemp(node: DriveNode): Promise<string> {
  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
  const dir = await mkdtemp(join(environment.supportPath, "dl-"));
  try {
    const result = await download([node.path], dir);
    const [entry] = await readdir(dir);
    if (result.failedItems > 0 || !entry) throw new Error(`Download failed: ${JSON.stringify(result.failures)}`);
    const path = join(dir, entry);
    await quarantine(path);
    return path;
  } catch (error) {
    // Never leave partial decrypted content behind.
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Marks downloaded content like a browser download, so macOS Gatekeeper checks it before an app
 * or script from the Drive can run. Files written by the CLI don't get this attribute otherwise.
 */
function quarantine(path: string): Promise<void> {
  const value = `0081;${Math.floor(Date.now() / 1000).toString(16)};Proton Drive (Raycast);`;
  return new Promise((resolve, reject) =>
    execFile("/usr/bin/xattr", ["-r", "-w", "com.apple.quarantine", value, path], (error) =>
      error ? reject(error) : resolve(),
    ),
  );
}

/** A Drive name as a safe single path component. */
function safeName(name: string): string {
  const cleaned = name.replace(/[/\0]/g, ":");
  return cleaned === "." || cleaned === ".." || !cleaned ? `_${cleaned}` : cleaned;
}

/** Downloads (or reuses a cached copy of) a file so it can be opened locally. */
export async function localCopyForOpening(node: DriveNode): Promise<string> {
  const key = createHash("sha1").update(`${node.path}|${node.modified}|${node.size}`).digest("hex").slice(0, 16);
  const dir = join(OPEN_CACHE, key);
  const target = join(dir, safeName(node.name));
  if (await exists(target)) return target;

  const tmp = await downloadToTemp(node);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await move(tmp, target);
  return target;
}

/** Downloads a file or folder into the user's download directory, never overwriting anything. */
export async function downloadToDownloads(node: DriveNode): Promise<string> {
  const { downloadDirectory } = getPreferenceValues<{ downloadDirectory?: string }>();
  const destDir = (downloadDirectory || "~/Downloads").replace(/^~(?=\/|$)/, homedir());
  const tmp = await downloadToTemp(node);
  const target = await uniquePath(destDir, basename(tmp));
  await move(tmp, target);
  return target;
}

/** Deletes decrypted copies older than a day, and leftovers of interrupted downloads. */
export async function pruneOpenCache(): Promise<void> {
  const prune = async (parent: string, match: (name: string) => boolean, maxAgeMs: number) => {
    const entries = await readdir(parent).catch(() => [] as string[]);
    await Promise.all(
      entries.filter(match).map(async (e) => {
        const p = join(parent, e);
        const s = await stat(p).catch(() => undefined);
        if (s && Date.now() - s.mtimeMs > maxAgeMs) await rm(p, { recursive: true, force: true });
      }),
    );
  };
  await prune(OPEN_CACHE, () => true, OPEN_CACHE_TTL);
  await prune(environment.supportPath, (n) => n.startsWith("dl-"), 3600_000);
}

async function move(from: string, to: string): Promise<void> {
  const tmpParent = join(from, "..");
  try {
    await rename(from, to);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EXDEV") throw e;
    // Different volume: rename is impossible, copy instead.
    const s = await stat(from);
    if (s.isDirectory()) await cp(from, to, { recursive: true });
    else await copyFile(from, to);
  }
  await rm(tmpParent, { recursive: true, force: true });
}

async function uniquePath(dir: string, name: string): Promise<string> {
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let candidate = join(dir, name);
  for (let i = 2; await exists(candidate); i++) candidate = join(dir, `${stem} (${i})${ext}`);
  return candidate;
}

async function exists(p: string): Promise<boolean> {
  return stat(p).then(
    () => true,
    () => false,
  );
}

/**
 * Deletes everything the extension keeps locally: search index, folder listings cached by Raycast,
 * decrypted copies. Used on logout so nothing of the previous account stays on the Mac.
 */
export async function clearLocalData(): Promise<void> {
  const cache = new Cache();
  cache.clear();
  // useCachedPromise keeps folder listings in namespaced caches next to the default one.
  await rm(cache.storageDirectory, { recursive: true, force: true });
  const entries = await readdir(environment.supportPath).catch(() => [] as string[]);
  await Promise.all(entries.map((e) => rm(join(environment.supportPath, e), { recursive: true, force: true })));
}
