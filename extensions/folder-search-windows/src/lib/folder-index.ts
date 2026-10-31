import { environment } from "@raycast/api";
import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * A local index of folder paths, so search is instant even on drives that
 * Everything does not index (Google Drive, exFAT/FAT external disks, network shares).
 *
 * Roots are scanned in parallel and partial results are saved every few seconds,
 * so closing Raycast mid-scan never loses work: the next run resumes the unfinished roots
 * while the folders found so far are already searchable.
 */

interface RootEntry {
  builtAt: number;
  complete: boolean;
  paths: string[];
}

interface IndexFile {
  version: 3;
  depth: number;
  roots: Record<string, RootEntry>;
}

const INDEX_FILE = () => path.join(environment.supportPath, "folder-index.json");
const CONCURRENCY_PER_ROOT = 12;
const FLUSH_EVERY_MS = 3000;

const SKIP_NAMES = new Set([
  "node_modules",
  "appdata",
  "system volume information",
  "windows",
  "__pycache__",
  "site-packages",
  "bower_components",
]);

function shouldSkip(name: string) {
  const n = name.toLowerCase();
  return n.startsWith(".") || n.startsWith("$") || n.startsWith("~$") || SKIP_NAMES.has(n);
}

const key = (root: string) => root.toLowerCase();

/** Debug output, visible in the terminal while running `npm run dev`. */
export function dlog(message: string) {
  if (environment.isDevelopment) console.log(`[folder-index] ${message}`);
}

/* ------------------------------------------------------------------ */
/* Roots                                                               */
/* ------------------------------------------------------------------ */

/** Every mounted drive except the system one (external disks, Google Drive, network), then the home folder. */
export function defaultRoots(): string[] {
  const system = (process.env.SystemDrive ?? "C:").toUpperCase();
  const drives: string[] = [];
  for (let c = 65; c <= 90; c++) {
    const letter = `${String.fromCharCode(c)}:`;
    if (letter === system) continue;
    try {
      if (existsSync(`${letter}\\`)) drives.push(`${letter}\\`);
    } catch {
      // drive not ready
    }
  }
  return [...drives, os.homedir()];
}

/* ------------------------------------------------------------------ */
/* Persistence (in-memory copy + serialized writes)                    */
/* ------------------------------------------------------------------ */

let memory: IndexFile | undefined;
let writeChain: Promise<void> = Promise.resolve();

async function getIndex(depth: number): Promise<IndexFile> {
  if (!memory) {
    try {
      const data = JSON.parse(await fs.readFile(INDEX_FILE(), "utf8")) as IndexFile;
      if (data.version === 3) memory = data;
    } catch {
      // no index yet
    }
  }
  if (!memory || memory.depth !== depth) memory = { version: 3, depth, roots: {} };
  return memory;
}

function saveIndex(): Promise<void> {
  writeChain = writeChain.then(async () => {
    if (!memory) return;
    try {
      await fs.mkdir(environment.supportPath, { recursive: true });
      const tmp = `${INDEX_FILE()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(memory), "utf8");
      await fs.rename(tmp, INDEX_FILE());
    } catch (error) {
      dlog(`save failed: ${(error as Error).message}`);
    }
  });
  return writeChain;
}

export interface IndexState {
  paths: string[];
  /** Roots that are missing, unfinished, or older than maxAge. */
  stale: string[];
}

export async function loadIndex(roots: string[], depth: number, maxAgeMs: number): Promise<IndexState> {
  const index = await getIndex(depth);
  const now = Date.now();
  const paths: string[] = [];
  const stale: string[] = [];
  for (const root of roots) {
    const entry = index.roots[key(root)];
    if (entry) paths.push(...entry.paths);
    if (!entry || !entry.complete || now - entry.builtAt > maxAgeMs) stale.push(root);
  }
  return { paths, stale };
}

/* ------------------------------------------------------------------ */
/* Scanning                                                            */
/* ------------------------------------------------------------------ */

/** Breadth-first walk with bounded parallelism; junctions/symlinks are not followed. */
function walk(root: string, maxDepth: number, onFlush: (paths: string[]) => void): Promise<string[]> {
  const out: string[] = [];
  const queue: [string, number][] = [[root, 0]];
  let head = 0;
  let active = 0;
  let lastFlush = Date.now();

  return new Promise((resolve) => {
    const pump = () => {
      while (active < CONCURRENCY_PER_ROOT && head < queue.length) {
        const [dir, depth] = queue[head++];
        active++;
        fs.readdir(dir, { withFileTypes: true })
          .then((entries) => {
            for (const e of entries) {
              if (!e.isDirectory() || shouldSkip(e.name)) continue;
              const p = path.win32.join(dir, e.name);
              out.push(p);
              if (depth + 1 < maxDepth) queue.push([p, depth + 1]);
            }
          })
          .catch(() => undefined) // permission denied, offline drive…
          .finally(() => {
            active--;
            if (Date.now() - lastFlush > FLUSH_EVERY_MS) {
              lastFlush = Date.now();
              onFlush(out);
            }
            if (head >= queue.length && active === 0) resolve(out);
            else pump();
          });
      }
    };
    pump();
  });
}

let running: Promise<void> | undefined;

/**
 * Scans the given roots in parallel. `onUpdate` receives the total folder count and
 * the root still being scanned, after every partial save.
 */
export function rebuildRoots(
  roots: string[],
  depth: number,
  onUpdate?: (info: { total: number; scanning: string[] }) => void,
): Promise<void> {
  if (running) return running;
  running = (async () => {
    const index = await getIndex(depth);
    const scanning = new Set(roots);
    const counts = new Map<string, number>();
    const started = Date.now();
    dlog(`rebuild start depth=${depth} roots=${roots.join(" | ")}`);

    const report = () => {
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      onUpdate?.({ total, scanning: [...scanning] });
    };

    await Promise.all(
      roots.map(async (root) => {
        const k = key(root);
        const previous = index.roots[k];
        counts.set(root, previous?.paths.length ?? 0);
        report();

        if (!existsSync(root)) {
          dlog(`root missing: ${root}`);
          delete index.roots[k];
          scanning.delete(root);
          return;
        }

        const paths = await walk(root, depth, (partial) => {
          // Keep the previous (complete) list searchable until the new one is bigger.
          if (!previous?.complete || partial.length >= previous.paths.length) {
            index.roots[k] = { builtAt: Date.now(), complete: false, paths: partial.slice() };
          }
          counts.set(root, partial.length);
          void saveIndex();
          report();
        });

        index.roots[k] = { builtAt: Date.now(), complete: true, paths };
        counts.set(root, paths.length);
        scanning.delete(root);
        await saveIndex();
        dlog(`root done: ${root} folders=${paths.length} after ${Math.round((Date.now() - started) / 1000)}s`);
        report();
      }),
    );
    dlog(`rebuild finished in ${Math.round((Date.now() - started) / 1000)}s`);
  })()
    .catch((error) => dlog(`rebuild error: ${(error as Error).stack ?? error}`))
    .finally(() => {
      running = undefined;
    });
  return running;
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

export const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export interface Searchable {
  path: string;
  name: string;
}

export function makeSearchable(paths: string[]): Searchable[] {
  const seen = new Set<string>();
  const out: Searchable[] = [];
  for (const p of paths) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ path: p, name: normalize(path.win32.basename(p)) });
  }
  return out;
}

/** All words must appear in the folder name; exact and prefix matches rank first, then shorter paths. */
export function searchIndex(items: Searchable[], query: string, limit: number): string[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const full = terms.join(" ");
  const wordStart = new RegExp(`(^|[\\s_\\-.])${escape(terms[0])}`);

  const scored: [number, Searchable][] = [];
  for (const item of items) {
    if (!terms.every((t) => item.name.includes(t))) continue;
    let score = 3;
    if (item.name === full) score = 0;
    else if (item.name.startsWith(terms[0])) score = 1;
    else if (wordStart.test(item.name)) score = 2;
    scored.push([score, item]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].path.length - b[1].path.length);
  return scored.slice(0, limit).map(([, i]) => i.path);
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
