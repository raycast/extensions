import { execFile as execFileCallback } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  getCachedFiles,
  getMruFiles,
  setCachedFiles,
  sortByMru,
} from "./cache";
import {
  filterByAsyncPredicate,
  searchRootsInParallel,
} from "./file-search-concurrency";
import { createPathExcluder, getRelativeDepth } from "./file-search-filters";

const execFile = promisify(execFileCallback);

export interface FileSearchOptions {
  roots: string[];
  allowedExtensions: string[];
  searchExcludes: string[];
  searchMaxDepth: number;
}

function buildCacheKey(
  roots: string[],
  allowedExtensions: string[],
  searchExcludes: string[],
  searchMaxDepth: number,
): string {
  const rootKey = [...roots]
    .map((root) => path.resolve(root))
    .sort()
    .join("|");
  const extKey = [...allowedExtensions]
    .map((ext) => ext.toLowerCase())
    .sort()
    .join("|");
  const excludesKey = [...searchExcludes]
    .map((exclude) => exclude.toLowerCase())
    .sort()
    .join("|");
  return `${rootKey}::${extKey}::${excludesKey}::${searchMaxDepth}`;
}

function getOptionsCacheKey(options: FileSearchOptions): string {
  return buildCacheKey(
    options.roots,
    options.allowedExtensions,
    options.searchExcludes,
    options.searchMaxDepth,
  );
}

function matchesExtension(
  filePath: string,
  allowedExtensions: string[],
): boolean {
  if (allowedExtensions.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(ext);
}

function dedupeFiles(files: string[]): string[] {
  return Array.from(new Set(files.map((file) => path.resolve(file))));
}

function buildSpotlightQuery(allowedExtensions: string[]): string {
  if (allowedExtensions.length === 0) return "kMDItemFSName == '*'";

  const clauses = allowedExtensions.map((ext) => `kMDItemFSName == '*${ext}'c`);
  return `(${clauses.join(" || ")})`;
}

async function findWithSpotlight(
  roots: string[],
  allowedExtensions: string[],
  searchExcludes: string[],
  searchMaxDepth: number,
): Promise<{ files: string[]; failedRoots: string[] }> {
  const query = buildSpotlightQuery(allowedExtensions);
  const isExcluded = createPathExcluder(searchExcludes);
  const summary = await searchRootsInParallel(roots, async (root) => {
    const { stdout } = await execFile("mdfind", ["-onlyin", root, query], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((filePath) => matchesExtension(filePath, allowedExtensions))
      .filter((filePath) => getRelativeDepth(root, filePath) <= searchMaxDepth)
      .filter((filePath) => !isExcluded(filePath, root));
  });

  return {
    files: dedupeFiles(summary.files),
    failedRoots: summary.failedRoots,
  };
}

async function findWithRecursiveScan(
  roots: string[],
  allowedExtensions: string[],
  searchExcludes: string[],
  searchMaxDepth: number,
): Promise<string[]> {
  const isExcluded = createPathExcluder(searchExcludes);
  const matches: string[] = [];

  for (const root of roots) {
    const stack: Array<{ directory: string; depth: number }> = [
      { directory: root, depth: 0 },
    ];

    while (stack.length > 0) {
      const current = stack.pop() as { directory: string; depth: number };

      let entries;
      try {
        entries = await readdir(current.directory, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;

        const fullPath = path.join(current.directory, entry.name);
        const childDepth = current.depth + 1;

        if (childDepth > searchMaxDepth) {
          continue;
        }

        if (isExcluded(fullPath, root)) {
          continue;
        }

        if (entry.isDirectory()) {
          stack.push({ directory: fullPath, depth: childDepth });
          continue;
        }

        if (entry.isFile() && matchesExtension(fullPath, allowedExtensions)) {
          matches.push(fullPath);
        }
      }
    }
  }

  return dedupeFiles(matches);
}

async function filterExistingFiles(files: string[]): Promise<string[]> {
  return filterByAsyncPredicate(
    files,
    async (filePath) => {
      try {
        await access(filePath);
        return true;
      } catch {
        // Ignore stale Spotlight entries.
        return false;
      }
    },
    64,
  );
}

export async function findCandidateFiles(
  options: FileSearchOptions,
): Promise<string[]> {
  const cacheKey = getOptionsCacheKey(options);
  const cached = await getCachedFiles(cacheKey);

  if (cached) {
    const mru = await getMruFiles();
    return sortByMru(cached, mru);
  }

  const spotlight = await findWithSpotlight(
    options.roots,
    options.allowedExtensions,
    options.searchExcludes,
    options.searchMaxDepth,
  );

  let files = spotlight.files;

  if (spotlight.failedRoots.length > 0) {
    const fallback = await findWithRecursiveScan(
      spotlight.failedRoots,
      options.allowedExtensions,
      options.searchExcludes,
      options.searchMaxDepth,
    );
    files = dedupeFiles([...files, ...fallback]);
  }

  const existing = await filterExistingFiles(files);
  await setCachedFiles(cacheKey, existing);

  const mru = await getMruFiles();
  return sortByMru(existing, mru);
}

export async function getCachedCandidateFiles(
  options: FileSearchOptions,
): Promise<string[] | undefined> {
  const cacheKey = getOptionsCacheKey(options);
  const cached = await getCachedFiles(cacheKey);
  if (!cached) return undefined;

  const mru = await getMruFiles();
  return sortByMru(cached, mru);
}
