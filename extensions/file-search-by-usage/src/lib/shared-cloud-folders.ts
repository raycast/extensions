import os from "node:os";
import path from "node:path";
import { createReadPool } from "./bounded-reads";
import { readBoundedDirectory } from "./bounded-directory";
import { readEntryMetadata } from "./directory-listing";
import { Entry } from "./types";

const SHORTCUT_TARGETS = ".shortcut-targets-by-id";
const sharedRead = createReadPool(4);

type DiscoveryOptions = {
  cloudRoot?: string;
  budgetMs?: number;
  maxDrives?: number;
  maxTargetIds?: number;
  maxFolders?: number;
};

async function mapBounded<T>(
  items: readonly T[],
  signal: AbortSignal,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (!signal.aborted) {
      const index = next++;
      if (index >= items.length) return;
      await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker));
}

async function list(dir: string, limit: number, signal: AbortSignal) {
  try {
    return await sharedRead(
      `shared:${dir}:${limit}`,
      () => readBoundedDirectory(dir, limit, false),
      signal,
    );
  } catch {
    return undefined;
  }
}

/** Discover Google Drive shortcut targets without blocking the Raycast worker. */
export async function discoverSharedCloudFolders(
  signal: AbortSignal,
  options: DiscoveryOptions = {},
): Promise<Entry[]> {
  const {
    cloudRoot = path.join(os.homedir(), "Library", "CloudStorage"),
    budgetMs = 1000,
    maxDrives = 16,
    maxTargetIds = 256,
    maxFolders = 200,
  } = options;
  const active = new AbortController();
  const stop = () => active.abort();
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  const timer = setTimeout(stop, budgetMs);

  try {
    const cloud = await list(cloudRoot, maxDrives, active.signal);
    if (!cloud) return [];
    const drives = cloud.entries
      .filter((entry) => entry.name.startsWith("GoogleDrive"))
      .map((entry) => path.join(cloudRoot, entry.name, SHORTCUT_TARGETS));

    const ids: string[] = [];
    await mapBounded(drives, active.signal, async (targets) => {
      const found = await list(targets, maxTargetIds, active.signal);
      if (!found) return;
      for (const entry of found.entries) {
        if (ids.length >= maxTargetIds) return;
        ids.push(path.join(targets, entry.name));
      }
    });

    const folders: string[] = [];
    await mapBounded(ids, active.signal, async (id) => {
      const found = await list(id, maxFolders, active.signal);
      if (!found) return;
      for (const entry of found.entries) {
        if (folders.length >= maxFolders) return;
        folders.push(path.join(id, entry.name));
      }
    });

    const entries: Entry[] = [];
    await mapBounded(folders, active.signal, async (full) => {
      try {
        const entry = await sharedRead(
          `shared:stat:${full}`,
          () => readEntryMetadata(full),
          active.signal,
        );
        if (entry && entries.length < maxFolders) entries.push(entry);
      } catch {
        /* A missing, unavailable, or timed-out target is simply omitted. */
      }
    });
    return entries;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}
