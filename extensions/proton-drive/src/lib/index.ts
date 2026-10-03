import { mkdir, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment, getPreferenceValues } from "@raycast/api";
import { DriveNode, joinPath, listFolder, ROOT } from "./cli";
import { isDemo } from "./demo";

/** Demo mode keeps its own index, so demo and real data never mix. */
const dataFile = (name: string) => join(environment.supportPath, isDemo() ? `demo-${name}` : name);
const indexFile = () => dataFile("index-v2.json");
const crawlFile = () => dataFile("crawl-v2.json");
/** Files of the first, much larger index format: parsing them alone could exceed Raycast's heap. */
const LEGACY_FILES = ["index.json", "crawl.json"].map((f) => join(environment.supportPath, f));
const LOCK_FILE = join(environment.supportPath, "index.lock");
/** The lock is touched at every checkpoint; one that hasn't been touched for this long is abandoned. */
const LOCK_TTL = 3 * 60_000;
const CHECKPOINT_EVERY = 30_000;
const CONCURRENCY = 6;
/** An interrupted crawl older than this is restarted from scratch instead of resumed. */
const CRAWL_MAX_AGE = 24 * 3600_000;
const FORMAT = 2;

/**
 * One indexed item, as a compact tuple: Raycast commands get a 100 MB heap, and a large Drive has
 * tens of thousands of items. Parent folders are stored once in `folders` and referenced by index.
 * [name, parent folder index, isFolder, size, modified, mediaType, shared (0 no, 1 people, 2 link), created]
 */
export type Entry = [string, number, 0 | 1, number | null, string | null, string | null, 0 | 1 | 2, (string | null)?];

export interface DriveIndex {
  format: typeof FORMAT;
  updatedAt: string;
  /** Paths of every listed folder; entries point to their parent here. */
  folders: string[];
  entries: Entry[];
  /** Set while the very first crawl is still running: results are incomplete. */
  partial?: boolean;
  /** Folders that could not be listed during the last crawl. */
  failedFolders?: string[];
}

/** Saved progress of an unfinished crawl, so it can be resumed by the next run. */
interface CrawlState {
  format: typeof FORMAT;
  startedAt: string;
  folders: string[];
  entries: Entry[];
  /** Indexes into `folders` still to be listed. */
  queue: number[];
  done: number;
  failedFolders: string[];
}

export async function readIndex(): Promise<DriveIndex | undefined> {
  await Promise.all(LEGACY_FILES.map((f) => rm(f, { force: true })));
  const index = await readJson<DriveIndex>(indexFile());
  return index?.format === FORMAT ? index : undefined;
}

/** Rebuilds a full node for display. Only done for the few results actually shown. */
export function entryToNode(index: DriveIndex, i: number): DriveNode {
  const [name, parent, isFolder, size, modified, mediaType, shared, created] = index.entries[i];
  const parentPath = index.folders[parent];
  const path = joinPath(parentPath, name);
  return {
    uid: path,
    name,
    path,
    parentPath,
    type: isFolder ? "folder" : "file",
    mediaType: mediaType ?? undefined,
    size: size ?? undefined,
    modified: modified ?? undefined,
    shared: shared > 0,
    sharedByUrl: shared === 2,
    created: created ?? undefined,
  };
}

export function backgroundRefreshEnabled(): boolean {
  return getPreferenceValues<{ enableBackgroundRefresh?: boolean }>().enableBackgroundRefresh === true;
}

export function isStale(index: DriveIndex | undefined, maxAgeMs = 24 * 3600_000): boolean {
  return !index || index.partial === true || Date.now() - Date.parse(index.updatedAt) > maxAgeMs;
}

/** True while another command (e.g. the background refresh) is already crawling. */
export async function isIndexing(): Promise<boolean> {
  const s = await stat(LOCK_FILE).catch(() => undefined);
  return Boolean(s && Date.now() - s.mtimeMs < LOCK_TTL);
}

function toEntry(node: DriveNode, parent: number): Entry {
  return [
    node.name,
    parent,
    node.type === "folder" ? 1 : 0,
    node.size ?? null,
    node.modified ?? null,
    node.mediaType ?? null,
    node.sharedByUrl ? 2 : node.shared ? 1 : 0,
    node.created ?? null,
  ];
}

/**
 * Walks the whole of /my-files, listing folders in parallel, and writes the result to disk.
 * The CLI has no recursive listing or search, so this is the only way to search the whole Drive.
 *
 * Every CLI call takes a few seconds, so a large Drive takes a long time, and Raycast may stop the
 * command before the end (window closed, background timeout). Progress is therefore checkpointed
 * and the next run resumes where the last one stopped. While no complete index exists, partial
 * results are published so search is usable during the first crawl.
 */
export async function buildIndex(
  onProgress?: (foldersDone: number, foldersLeft: number, partial: DriveIndex) => void,
): Promise<DriveIndex> {
  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
  await writeFile(LOCK_FILE, String(process.pid));
  const previous = await readIndex();
  const publishPartial = !previous || previous.partial === true;

  try {
    const saved = await readJson<CrawlState>(crawlFile());
    const resume = saved?.format === FORMAT && Date.now() - Date.parse(saved.startedAt) < CRAWL_MAX_AGE;
    const state: CrawlState = resume
      ? saved
      : {
          format: FORMAT,
          startedAt: new Date().toISOString(),
          folders: [ROOT],
          entries: [],
          queue: [0],
          done: 0,
          failedFolders: [],
        };

    const inFlight = new Set<number>();
    let lastCheckpoint = Date.now();

    const snapshot = (partial: boolean): DriveIndex => ({
      format: FORMAT,
      updatedAt: partial ? state.startedAt : new Date().toISOString(),
      folders: state.folders,
      entries: state.entries,
      partial: partial || undefined,
      failedFolders: state.failedFolders.length ? state.failedFolders : undefined,
    });

    const saveCheckpoint = async () => {
      const now = new Date();
      await utimes(LOCK_FILE, now, now).catch(() => undefined);
      // Folders being listed right now aren't done: put them back so a resumed crawl redoes them.
      await writeJson(crawlFile(), { ...state, queue: [...inFlight, ...state.queue] });
      if (publishPartial) await writeJson(indexFile(), snapshot(true));
    };

    const listWithRetry = (path: string) => listFolder(path).catch(() => listFolder(path));

    await new Promise<void>((resolve, reject) => {
      const pump = () => {
        if (state.queue.length === 0 && inFlight.size === 0) return resolve();
        while (inFlight.size < CONCURRENCY && state.queue.length > 0) {
          const folder = state.queue.shift()!;
          const path = state.folders[folder];
          inFlight.add(folder);
          listWithRetry(path)
            .then((children) => {
              for (const child of children) {
                state.entries.push(toEntry(child, folder));
                if (child.type === "folder") state.queue.push(state.folders.push(child.path) - 1);
              }
            })
            .catch((error) => {
              // If the root can't be listed (signed out, CLI missing…), nothing else will work either.
              if (path === ROOT) throw error;
              state.failedFolders.push(path);
            })
            .then(async () => {
              inFlight.delete(folder);
              state.done++;
              onProgress?.(state.done, state.queue.length + inFlight.size, snapshot(true));
              if (Date.now() - lastCheckpoint > CHECKPOINT_EVERY) {
                lastCheckpoint = Date.now();
                await saveCheckpoint();
              }
              pump();
            })
            .catch(reject);
        }
      };
      pump();
    });

    const index = snapshot(false);
    await writeJson(indexFile(), index);
    await rm(crawlFile(), { force: true });
    return index;
  } finally {
    await rm(LOCK_FILE, { force: true });
  }
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(path: string, value: unknown) {
  const tmp = `${path}.tmp`;
  // Item names are stored in clear here: readable by this macOS user only.
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, path);
}
