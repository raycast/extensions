import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Filesystem fixture helpers for integration tests. They build small,
 * disposable directory trees that mimic real repository layouts (normal, bare,
 * worktree, nested, symlinked) without needing a real Git installation.
 */

/** A temporary directory with a cleanup function. */
export interface TempTree {
  readonly root: string;
  cleanup(): void;
  /** Create a directory (recursively) at a path relative to the root. */
  dir(relative: string): string;
  /** Create a file with contents at a path relative to the root. */
  file(relative: string, contents?: string): string;
  /** Create a `.git` directory (normal repo) at a relative path. */
  gitRepo(relative: string): string;
  /** Create a bare repo (HEAD/objects/refs) at a relative path. */
  bareRepo(relative: string): string;
  /** Create a `.git` file (linked worktree) at a relative path. */
  worktree(relative: string): string;
  /** Create a symlink at `linkRelative` pointing to `targetRelative`. */
  symlink(linkRelative: string, targetRelative: string): string;
}

/** Create a temporary directory tree for a test. Remember to call cleanup(). */
export function makeTempTree(): TempTree {
  const root = mkdtempSync(join(tmpdir(), "reposcout-test-"));

  const abs = (relative: string) => join(root, relative);

  const dir = (relative: string): string => {
    const path = abs(relative);
    mkdirSync(path, { recursive: true });
    return path;
  };

  const file = (relative: string, contents = ""): string => {
    const path = abs(relative);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, contents);
    return path;
  };

  const gitRepo = (relative: string): string => {
    const path = dir(relative);
    mkdirSync(join(path, ".git"), { recursive: true });
    writeFileSync(join(path, ".git", "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(join(path, ".git", "index"), "");
    return path;
  };

  const bareRepo = (relative: string): string => {
    const path = dir(relative);
    writeFileSync(join(path, "HEAD"), "ref: refs/heads/main\n");
    mkdirSync(join(path, "objects"), { recursive: true });
    mkdirSync(join(path, "refs"), { recursive: true });
    return path;
  };

  const worktree = (relative: string): string => {
    const path = dir(relative);
    writeFileSync(join(path, ".git"), "gitdir: /somewhere/.git/worktrees/wt\n");
    return path;
  };

  const symlink = (linkRelative: string, targetRelative: string): string => {
    const linkPath = abs(linkRelative);
    mkdirSync(join(linkPath, ".."), { recursive: true });
    symlinkSync(abs(targetRelative), linkPath);
    return linkPath;
  };

  const cleanup = () => {
    rmSync(root, { recursive: true, force: true });
  };

  return { root, cleanup, dir, file, gitRepo, bareRepo, worktree, symlink };
}
