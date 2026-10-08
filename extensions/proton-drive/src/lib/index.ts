import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { CliError, DriveNode, joinPath, listFolder, ROOT } from "./cli";
import { isDemo } from "./demo";

/**
 * Index files live in their own directory, created only when a build starts. Writes never recreate it,
 * so once logout deletes it, a build still running elsewhere can no longer write anything back.
 */
const INDEX_DIR = join(environment.supportPath, "index");
/** Demo mode keeps its own index, so demo and real data never mix. */
const dataFile = (name: string) => join(INDEX_DIR, isDemo() ? `demo-${name}` : name);
const indexFile = () => dataFile("index-v2.json");
const crawlFile = () => dataFile("crawl-v2.json");
const LOCK_FILE = join(INDEX_DIR, "index.lock");
/** Where earlier versions kept these files, directly in the support directory. */
const legacyFile = (name: string) => join(environment.supportPath, name);
/** A running build touches its lock every LOCK_HEARTBEAT; one untouched for LOCK_TTL is abandoned. */
const LOCK_TTL = 3 * 60_000;
const LOCK_HEARTBEAT = 30_000;
const CHECKPOINT_EVERY = 30_000;
const CONCURRENCY = 6;
/** An interrupted crawl older than this is restarted from scratch instead of resumed. */
const CRAWL_MAX_AGE = 24 * 3600_000;
const FORMAT = 2;

/**
 * One indexed item, as a compact tuple: Raycast commands get a 100 MB heap, and a large Drive has
 * tens of thousands of items. Parent folders are stored once in `folders` and referenced by index.
 * [name, parent folder index, isFolder, size, modified, mediaType, shared (0 no, 1 people, 2 link), created,
 *  path segment when it differs from the name (undecryptable names are addressed by UID)]
 */
export type Entry = [
  string,
  number,
  0 | 1,
  number | null,
  string | null,
  string | null,
  0 | 1 | 2,
  (string | null)?,
  (string | null)?,
];

/** Another command is already building the index. */
export class IndexBusyError extends Error {}
/** The build lost its lock (local data cleared on logout, or a stale lock taken over): nothing was written. */
export class IndexAbortedError extends Error {}

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

/**
 * Deletes the index for logout. The directory is first renamed, which is atomic: from that moment a
 * build still running elsewhere cannot complete any write (its paths no longer exist), whereas a
 * plain recursive delete could race with a file the build creates while the delete is in progress.
 */
export async function deleteIndexData(): Promise<void> {
  const doomed = `${INDEX_DIR}.deleted-${randomUUID()}`;
  try {
    await rename(INDEX_DIR, doomed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  await rm(doomed, { recursive: true, force: true, maxRetries: 5 });
}

let migrated = false;

/**
 * Moves index files from the support directory into INDEX_DIR, and drops the first index format
 * (its files were large enough that parsing them alone could exceed Raycast's memory limit).
 */
async function migrateLegacyFiles() {
  if (migrated) return;
  migrated = true;
  await Promise.all(["index.json", "crawl.json", "index.lock"].map((f) => rm(legacyFile(f), { force: true })));
  const current = ["index-v2.json", "crawl-v2.json", "demo-index-v2.json", "demo-crawl-v2.json"];
  const present = (
    await Promise.all(
      current.map((f) =>
        stat(legacyFile(f)).then(
          () => f,
          () => undefined,
        ),
      ),
    )
  ).filter((f): f is string => Boolean(f));
  if (present.length === 0) return;
  await mkdir(INDEX_DIR, { recursive: true, mode: 0o700 });
  await Promise.all(present.map((f) => rename(legacyFile(f), join(INDEX_DIR, f)).catch(() => undefined)));
}

export async function readIndex(): Promise<DriveIndex | undefined> {
  await migrateLegacyFiles();
  const index = await readJson<DriveIndex>(indexFile());
  return index?.format === FORMAT ? index : undefined;
}

/** Rebuilds a full node for display. Only done for the few results actually shown. */
export function entryToNode(index: DriveIndex, i: number): DriveNode {
  const [name, parent, isFolder, size, modified, mediaType, shared, created, segment] = index.entries[i];
  const parentPath = index.folders[parent];
  const path = segment ? `${parentPath}/${segment}` : joinPath(parentPath, name);
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

/** True while another command (e.g. the background refresh) is already crawling. */
export async function isIndexing(): Promise<boolean> {
  const s = await stat(LOCK_FILE).catch(() => undefined);
  return Boolean(s && Date.now() - s.mtimeMs < LOCK_TTL);
}

function toEntry(node: DriveNode, parent: number): Entry {
  const segment = node.path.slice(node.parentPath.length + 1);
  return [
    node.name,
    parent,
    node.type === "folder" ? 1 : 0,
    node.size ?? null,
    node.modified ?? null,
    node.mediaType ?? null,
    node.sharedByUrl ? 2 : node.shared ? 1 : 0,
    node.created ?? null,
    segment === joinPath("", node.name).slice(1) ? null : segment,
  ];
}

/** Claims the lock exclusively; a lock left by a crashed build is taken over. Returns our token. */
async function acquireLock(): Promise<string> {
  const token = `${process.pid}:${randomUUID()}`;
  const claim = () => writeFile(LOCK_FILE, token, { flag: "wx" });
  try {
    await claim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (await isIndexing()) throw new IndexBusyError("Proton Drive is already being indexed");
    await rm(LOCK_FILE, { force: true });
    await claim().catch(() => {
      throw new IndexBusyError("Proton Drive is already being indexed");
    });
  }
  return token;
}

async function ownsLock(token: string): Promise<boolean> {
  return (await readFile(LOCK_FILE, "utf8").catch(() => "")) === token;
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
  await migrateLegacyFiles();
  // The only place the index directory is created (see INDEX_DIR).
  await mkdir(INDEX_DIR, { recursive: true, mode: 0o700 });
  const token = await acquireLock();
  // Keep the lock fresh even while a slow listing holds up checkpoints.
  const heartbeat = setInterval(() => {
    const now = new Date();
    ownsLock(token).then((owned) => {
      if (owned) return utimes(LOCK_FILE, now, now).catch(() => undefined);
    });
  }, LOCK_HEARTBEAT);
  const previous = await readIndex();
  const publishPartial = !previous || previous.partial === true;
  /**
   * Writes only while the lock is ours. If logout deletes INDEX_DIR after this check, the write itself
   * fails (the directory is gone), so the previous account's data is never written back.
   */
  const guardedWrite = async (path: string, json: string) => {
    if (!(await ownsLock(token))) throw new IndexAbortedError("Indexing stopped");
    await writeText(path, json, token).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new IndexAbortedError("Indexing stopped");
      throw error;
    });
  };

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
      // Folders being listed right now aren't done: put them back so a resumed crawl redoes them.
      // Serialize now, synchronously: a listing that finishes during the writes below would otherwise
      // add its children while its folder is still saved as pending, and a resumed crawl would list it
      // again, duplicating those entries.
      const crawlJson = JSON.stringify({ ...state, queue: [...inFlight, ...state.queue] });
      const partialJson = publishPartial ? JSON.stringify(snapshot(true)) : undefined;
      await guardedWrite(crawlFile(), crawlJson);
      if (partialJson) await guardedWrite(indexFile(), partialJson);
    };

    const crawl = () =>
      new Promise<void>((resolve, reject) => {
        const pump = () => {
          if (state.queue.length === 0 && inFlight.size === 0) return resolve();
          while (inFlight.size < CONCURRENCY && state.queue.length > 0) {
            const folder = state.queue.shift()!;
            const path = state.folders[folder];
            inFlight.add(folder);
            listFolder(path)
              .then((children) => {
                for (const child of children) {
                  state.entries.push(toEntry(child, folder));
                  if (child.type === "folder") state.queue.push(state.folders.push(child.path) - 1);
                }
              })
              .catch((error) => {
                // Fatal: the root can't be listed (CLI missing…), or the session is gone. Continuing would
                // record every remaining folder as failed and replace a good index with a sparse one.
                if (path === ROOT || (error instanceof CliError && error.signedOut)) throw error;
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

    await crawl();
    // Give folders that failed (twice, see listFolder) one more round, after the rest of the Drive.
    if (state.failedFolders.length) {
      state.queue = state.failedFolders.map((path) => state.folders.indexOf(path)).filter((i) => i >= 0);
      state.failedFolders = [];
      await crawl();
    }

    // Folders still failing are recorded: the index is marked stale and the UI says what is missing.
    const index = snapshot(false);
    await guardedWrite(indexFile(), JSON.stringify(index));
    await rm(crawlFile(), { force: true });
    return index;
  } finally {
    clearInterval(heartbeat);
    if (await ownsLock(token)) await rm(LOCK_FILE, { force: true });
  }
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/** Atomic write; `writer` keeps temporary files of concurrent writers apart. */
async function writeText(path: string, text: string, writer: string) {
  const tmp = `${path}.${writer.replace(/\W/g, "")}.tmp`;
  // Item names are stored in clear here: readable by this macOS user only.
  await writeFile(tmp, text, { mode: 0o600 });
  await rename(tmp, path);
}
