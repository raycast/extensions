import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * Lightweight git introspection without spawning processes: finds the repo root
 * (following worktree `.git` files to the common dir) and reads origin's URL.
 */

const cache = new Map<string, { repo: string | null; repoRoot: string | null }>();

export function parseRemoteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.trim().match(/[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

function readOriginFromConfig(configPath: string): string | null {
  try {
    const text = readFileSync(configPath, "utf8");
    const section = text.match(/\[remote "origin"\][^[]*/);
    const url = section?.[0].match(/^\s*url\s*=\s*(.+)$/m)?.[1];
    return parseRemoteUrl(url) ?? null;
  } catch {
    return null;
  }
}

function findGitEntry(start: string): { root: string; gitPath: string } | null {
  let dir = resolve(start);
  for (let i = 0; i < 40; i++) {
    const gitPath = join(dir, ".git");
    if (existsSync(gitPath)) return { root: dir, gitPath };
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/** Strip well-known worktree suffixes so a deleted worktree still maps to its project. */
export function guessProjectDirFromPath(cwd: string): string {
  return cwd.replace(/\/(\.claude\/worktrees|\.worktrees|\.codex\/worktrees|worktrees)\/[^/]+.*$/, "");
}

export function resolveRepo(cwd: string | null): { repo: string | null; repoRoot: string | null } {
  if (!cwd) return { repo: null, repoRoot: null };
  const hit = cache.get(cwd);
  if (hit) return hit;
  let result: { repo: string | null; repoRoot: string | null } = { repo: null, repoRoot: null };
  try {
    if (existsSync(cwd)) {
      const entry = findGitEntry(cwd);
      if (entry) {
        let commonDir = entry.gitPath;
        if (statSync(entry.gitPath).isFile()) {
          const gitdir = readFileSync(entry.gitPath, "utf8")
            .match(/gitdir:\s*(.+)/)?.[1]
            ?.trim();
          if (gitdir) {
            const abs = resolve(entry.root, gitdir);
            const common = join(abs, "commondir");
            commonDir = existsSync(common) ? resolve(abs, readFileSync(common, "utf8").trim()) : abs;
          }
        }
        result = { repo: readOriginFromConfig(join(commonDir, "config")), repoRoot: entry.root };
      }
    } else {
      // Deleted worktree: try the parent project directory.
      const guess = guessProjectDirFromPath(cwd);
      if (guess !== cwd && existsSync(guess)) result = resolveRepo(guess);
    }
  } catch {
    // best effort
  }
  cache.set(cwd, result);
  return result;
}

/** Short display name for a session's project. */
export function projectLabel(repo: string | null, cwd: string | null): string {
  if (repo) return repo.split("/")[1] ?? repo;
  if (cwd) return basename(guessProjectDirFromPath(cwd)) || cwd;
  return "unknown";
}
