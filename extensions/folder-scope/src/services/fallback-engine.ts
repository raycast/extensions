import type { Dirent } from "node:fs";
import { open, readFile, readdir, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { setImmediate as yieldToEventLoop } from "node:timers/promises";
import type { SearchCompletion, SearchEngine, SearchError, SearchRequest, SearchResult } from "../types/search.ts";
import {
  compileGlob,
  compileQueryMatcher,
  globMatches,
  isIgnoredByRules,
  looksBinary,
  parseIgnoreContent,
  scanLines,
  scanMultiline,
  splitLines,
  type CompiledGlob,
  type FileMatch,
  type IgnoreRule,
} from "../utils/fallback-search.ts";

// ponytail: per-directory file pool; a global worker pool if throughput matters.
// Memory ceiling is FILE_CONCURRENCY × maxFileSizeBytes for whole-file reads.
const FILE_CONCURRENCY = 4;
/** Lines scanned between event-loop yields so large files cannot block the UI. */
const LINES_PER_CHUNK = 2000;
/** ripgrep also reads `.rgignore`; two names cover the common cases (documented divergence). */
const IGNORE_FILE_NAMES = [".gitignore", ".ignore"];

interface IgnoreScope {
  directory: string;
  rules: IgnoreRule[];
}

interface PendingDirectory {
  path: string;
  /** Levels below the search root; the root itself is 0. */
  depth: number;
  ignores: IgnoreScope[];
}

function searchError(kind: SearchError["kind"], message: string): SearchError {
  return { kind, message };
}

function isSearchError(error: unknown): error is SearchError {
  return typeof error === "object" && error !== null && "kind" in error && "message" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compileAll(globs: string[]): CompiledGlob[] {
  return globs.map(compileGlob).filter((glob): glob is CompiledGlob => glob !== null);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

/** `dev:ino` identity used for symlink-cycle detection; undefined when the path is unreadable. */
async function directoryKey(path: string): Promise<string | undefined> {
  try {
    const stats = await stat(path);
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return undefined;
  }
}

async function runLimited<T>(items: T[], limit: number, run: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await run(items[next++]);
  });
  await Promise.all(workers);
}

/**
 * Pure-Node fallback engine: recursive, cancellable, bounded-concurrency file
 * scanning with no external processes. Honors the shared `SearchOptions`
 * semantics where feasible; divergences from ripgrep (regex dialect, UTF-16
 * columns, glob/ignore subset, UTF-8-only decoding, no filename search) are
 * documented on the helpers in `utils/fallback-search.ts`.
 */
export class FallbackEngine implements SearchEngine {
  public readonly type = "node-fallback" as const;

  async search(request: SearchRequest): Promise<SearchCompletion> {
    const { directory, options, signal } = request;
    if (signal.aborted) return { limitReached: false, cancelled: true };

    const matcher = compileQueryMatcher(request.query, options);
    const includeGlobs = compileAll(options.includeGlobs);
    const excludeGlobs = compileAll(options.excludeGlobs);
    const includedExtensions = new Set(options.includedExtensions);
    const excludedExtensions = new Set(options.excludedExtensions);
    const excludedDirectories = new Set(options.excludedDirectories);
    const requireInclusion = includedExtensions.size > 0 || includeGlobs.length > 0;

    let emitted = 0;
    let limitReached = false;
    const stopped = () => signal.aborted || limitReached;
    const remaining = () => Math.max(0, options.maxResults - emitted);

    const emit = (filePath: string, relativePath: string, matches: FileMatch[]) => {
      if (stopped() || matches.length === 0) return;
      const batch = matches.slice(0, remaining()).map((match): SearchResult => ({
        filePath,
        relativePath,
        fileName: basename(filePath),
        line: match.line,
        column: match.column,
        lineText: match.lineText,
        ...(match.contextBefore ? { contextBefore: match.contextBefore } : {}),
        ...(match.contextAfter ? { contextAfter: match.contextAfter } : {}),
      }));
      emitted += batch.length;
      if (emitted >= options.maxResults) limitReached = true;
      request.onResults(batch);
    };

    const isIgnored = (scopes: IgnoreScope[], absolutePath: string, isDirectory: boolean): boolean =>
      scopes.some((scope) => isIgnoredByRules(scope.rules, relative(scope.directory, absolutePath), isDirectory));

    const withIgnoreScope = async (dir: PendingDirectory): Promise<IgnoreScope[]> => {
      const rules: IgnoreRule[] = [];
      for (const name of IGNORE_FILE_NAMES) {
        try {
          rules.push(...parseIgnoreContent(await readFile(join(dir.path, name), "utf8")));
        } catch {
          // No ignore file in this directory.
        }
      }
      return rules.length > 0 ? [...dir.ignores, { directory: dir.path, rules }] : dir.ignores;
    };

    const scanFile = async (filePath: string): Promise<void> => {
      if (stopped()) return;
      let content: string;
      try {
        const handle = await open(filePath, "r");
        try {
          const stats = await handle.stat();
          if (!stats.isFile() || stats.size > options.maxFileSizeBytes) return;
          const size = Number(stats.size);
          if (size === 0) {
            content = "";
          } else {
            const buffer = Buffer.alloc(size);
            const { bytesRead } = await handle.read(buffer, 0, size, 0);
            const data = bytesRead < size ? buffer.subarray(0, bytesRead) : buffer;
            if (!options.includeBinary && looksBinary(data)) return;
            content = data.toString("utf8");
          }
        } finally {
          await handle.close();
        }
      } catch {
        return; // Unreadable or deleted while scanning — skip and continue.
      }
      if (stopped()) return;

      const relativePath = relative(directory, filePath) || basename(filePath);
      const context = { contextBefore: options.contextBefore, contextAfter: options.contextAfter };
      const lines = splitLines(content);
      if (matcher.multiline) {
        emit(filePath, relativePath, scanMultiline(content, lines, matcher, { ...context, maxMatches: remaining() }));
        return;
      }
      for (let start = 0; start < lines.length && !stopped(); start += LINES_PER_CHUNK) {
        const end = Math.min(start + LINES_PER_CHUNK, lines.length);
        emit(filePath, relativePath, scanLines(lines, start, end, matcher, { ...context, maxMatches: remaining() }));
        if (end < lines.length) await yieldToEventLoop();
      }
    };

    const visitedDirectories = new Set<string>();
    if (options.followSymlinks) {
      const rootKey = await directoryKey(directory);
      if (rootKey === undefined) {
        throw searchError("directory-inaccessible", `Cannot access the search directory: ${directory}`);
      }
      visitedDirectories.add(rootKey);
    }

    const walk = async (): Promise<void> => {
      const stack: PendingDirectory[] = [{ path: directory, depth: 0, ignores: [] }];
      while (stack.length > 0 && !stopped()) {
        const dir = stack.pop();
        if (!dir) break;
        let entries: Dirent[];
        try {
          entries = await readdir(dir.path, { withFileTypes: true });
        } catch (error) {
          if (dir.path === directory) {
            throw searchError("directory-inaccessible", `Cannot read the search directory: ${errorMessage(error)}`);
          }
          continue; // Subdirectory removed or unreadable — skip and continue.
        }
        const ignores = options.respectIgnoreFiles ? await withIgnoreScope(dir) : dir.ignores;

        const files: string[] = [];
        for (const entry of entries) {
          if (stopped()) return;
          if (!options.includeHidden && entry.name.startsWith(".")) continue;
          const entryPath = join(dir.path, entry.name);
          let isDirectory = entry.isDirectory();
          let isFile = entry.isFile();
          if (entry.isSymbolicLink()) {
            if (!options.followSymlinks) continue;
            try {
              const stats = await stat(entryPath);
              isDirectory = stats.isDirectory();
              isFile = stats.isFile();
            } catch {
              continue; // Dangling symlink.
            }
          }

          if (isDirectory) {
            if (excludedDirectories.has(entry.name)) continue;
            if (options.maxDepth !== null && dir.depth + 1 >= options.maxDepth) continue;
            if (isIgnored(ignores, entryPath, true)) continue;
            if (options.followSymlinks) {
              const key = await directoryKey(entryPath);
              if (key === undefined || visitedDirectories.has(key)) continue;
              visitedDirectories.add(key);
            }
            stack.push({ path: entryPath, depth: dir.depth + 1, ignores });
          } else if (isFile) {
            const extension = extensionOf(entry.name);
            if (excludedExtensions.has(extension)) continue;
            const relativePath = relative(directory, entryPath);
            if (
              requireInclusion &&
              !includedExtensions.has(extension) &&
              !includeGlobs.some((glob) => globMatches(glob, relativePath))
            ) {
              continue;
            }
            if (excludeGlobs.some((glob) => globMatches(glob, relativePath))) continue;
            if (isIgnored(ignores, entryPath, false)) continue;
            files.push(entryPath);
          }
        }
        await runLimited(files, FILE_CONCURRENCY, scanFile);
      }
    };

    try {
      await walk();
    } catch (error) {
      if (isSearchError(error)) throw error;
      throw searchError("unexpected", `Node.js fallback failed: ${errorMessage(error)}`);
    }

    if (signal.aborted) return { limitReached: false, cancelled: true };
    return { limitReached, cancelled: false };
  }
}
