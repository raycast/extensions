import { readdir, realpath } from "node:fs/promises";
import { basename, join } from "node:path";
import type { DiscoveredRepository } from "../types/repository";
import { createLogger } from "../utils/logger";
import { detectRepositoryKind, type DirEntryInfo } from "./git-markers";
import { computeFingerprint } from "./fingerprint";

const log = createLogger("discovery");

/** Options controlling a filesystem scan for Git repositories. */
export interface DiscoveryOptions {
  /** Absolute, tilde-expanded directories to scan. */
  readonly roots: readonly string[];
  /** Maximum directory levels to descend below each root (root = depth 0). */
  readonly maxDepth: number;
  /** Directory names to skip entirely (e.g. `node_modules`). */
  readonly ignoredDirectories: ReadonlySet<string>;
  /** Whether to descend into symlinked directories. */
  readonly followSymlinks: boolean;
  /** Whether to detect bare repositories. */
  readonly includeBareRepos: boolean;
  /** Optional callback fired each time a repository is discovered. */
  readonly onDiscover?: (repo: DiscoveredRepository, total: number) => void;
  /** Optional abort signal to cancel a long-running scan. */
  readonly signal?: AbortSignal;
}

interface StackFrame {
  readonly path: string;
  readonly depth: number;
}

/** A directory entry enriched with the symlink flag discovery needs. */
interface ScanEntry extends DirEntryInfo {
  readonly isSymbolicLink: boolean;
}

/**
 * A directory name is scannable when it is not explicitly ignored and not a
 * dotfile-style Git internal we never want to descend into.
 */
function shouldScanDirectory(name: string, ignored: ReadonlySet<string>): boolean {
  if (ignored.has(name)) {
    return false;
  }
  // `.git` is handled by classification; never descend into it as a plain dir.
  if (name === ".git") {
    return false;
  }
  return true;
}

/**
 * Read a directory's entries, returning `null` (and logging) on any error such
 * as EACCES (permissions) or ENOENT (removed mid-scan). Discovery must never
 * abort the whole scan because one directory is unreadable.
 */
async function safeReadEntries(path: string): Promise<ScanEntry[] | null> {
  try {
    const dirents = await readdir(path, { withFileTypes: true });
    return dirents.map((dirent) => ({
      name: dirent.name,
      isDirectory: dirent.isDirectory(),
      isFile: dirent.isFile(),
      isSymbolicLink: dirent.isSymbolicLink(),
    }));
  } catch (error) {
    log.debug(`skipping unreadable directory ${path}`, error);
    return null;
  }
}

/**
 * Resolve the canonical path for cycle detection. When following symlinks we
 * must dedupe by real path so a symlink loop cannot spin forever. When not
 * following symlinks the path is already canonical enough for our purposes.
 */
async function canonicalPath(path: string, followSymlinks: boolean): Promise<string> {
  if (!followSymlinks) {
    return path;
  }
  try {
    return await realpath(path);
  } catch {
    return path;
  }
}

/**
 * Discover every Git repository beneath the configured search roots.
 *
 * The scan is iterative (an explicit stack, not recursion) so it can handle
 * very deep and very wide trees without overflowing the call stack. Once a
 * directory is identified as a repository it is recorded and **not** descended
 * into, which avoids indexing submodules and vendored nested repos by default.
 *
 * All filesystem errors are handled gracefully: unreadable directories are
 * skipped and logged, never thrown.
 *
 * @param options See {@link DiscoveryOptions}.
 * @returns All discovered repositories, de-duplicated by canonical path.
 */
export async function discoverRepositories(
  options: DiscoveryOptions,
): Promise<DiscoveredRepository[]> {
  const { roots, maxDepth, ignoredDirectories, followSymlinks, includeBareRepos } = options;

  const discovered: DiscoveredRepository[] = [];
  const visited = new Set<string>();
  const stack: StackFrame[] = [];

  for (const root of roots) {
    stack.push({ path: root, depth: 0 });
  }

  while (stack.length > 0) {
    if (options.signal?.aborted) {
      log.info("discovery aborted by signal");
      break;
    }

    const frame = stack.pop() as StackFrame;
    const canonical = await canonicalPath(frame.path, followSymlinks);
    if (visited.has(canonical)) {
      continue;
    }
    visited.add(canonical);

    const entries = await safeReadEntries(frame.path);
    if (entries === null) {
      continue;
    }

    const kind = detectRepositoryKind(entries, includeBareRepos);
    if (kind !== null) {
      const fingerprint = await computeFingerprint(frame.path, kind);
      const repo: DiscoveredRepository = {
        path: frame.path,
        name: basename(frame.path),
        kind,
        fingerprint,
      };
      discovered.push(repo);
      options.onDiscover?.(repo, discovered.length);
      // Do not descend into a repository root by default.
      continue;
    }

    if (frame.depth >= maxDepth) {
      continue;
    }

    for (const entry of entries) {
      // Symlinked directories report `isDirectory() === false`; only descend
      // into them when the user opted in. Real directories always qualify.
      const descendable = entry.isDirectory || (followSymlinks && entry.isSymbolicLink);
      if (!descendable) {
        continue;
      }
      if (!shouldScanDirectory(entry.name, ignoredDirectories)) {
        continue;
      }
      stack.push({ path: join(frame.path, entry.name), depth: frame.depth + 1 });
    }
  }

  return discovered;
}
