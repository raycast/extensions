import path from "node:path";

/** A repository directory managed by ghq. */
export type Repository = {
  /** Absolute path of the repository directory. */
  path: string;
  /** Path relative to the ghq root (e.g. `github.com/owner/repo`), or the absolute path when no root matches. */
  relativePath: string;
  /** Last path segment (the repository directory name). */
  name: string;
  /** Second-to-last segment (usually the owner / organization). */
  owner: string | undefined;
  /** First segment when the path has at least three segments (usually the host, e.g. `github.com`). */
  host: string | undefined;
};

/** Splits command output into trimmed, non-empty lines. */
export function parseLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripTrailingSlash(p: string): string {
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** Returns `fullPath` relative to the longest matching root, or `fullPath` itself when no root matches on a path boundary. */
function relativeToRoots(roots: string[], fullPath: string): string {
  const normalizedRoots = roots
    .map(stripTrailingSlash)
    .filter((root) => root.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const root of normalizedRoots) {
    if (fullPath === root) {
      return "";
    }
    if (fullPath.startsWith(root + "/")) {
      return fullPath.slice(root.length + 1);
    }
  }
  return fullPath;
}

/** Converts absolute paths from `ghq list -p` into {@link Repository} objects, preserving order and dropping duplicates. */
export function toRepositories(roots: string[], fullPaths: string[]): Repository[] {
  const seen = new Set<string>();
  const repositories: Repository[] = [];

  for (const rawPath of fullPaths) {
    const fullPath = stripTrailingSlash(rawPath);
    if (seen.has(fullPath)) {
      continue;
    }
    seen.add(fullPath);

    const relativePath = relativeToRoots(roots, fullPath);
    const segments = relativePath.split("/").filter((segment) => segment.length > 0);
    const name = segments[segments.length - 1] ?? path.basename(fullPath);

    repositories.push({
      path: fullPath,
      relativePath,
      name,
      owner: segments.length >= 2 ? segments[segments.length - 2] : undefined,
      host: segments.length >= 3 ? segments[0] : undefined,
    });
  }

  return repositories;
}

/**
 * Normalizes the ghq binary path configured in the extension preferences:
 * trims whitespace and expands a leading `~/` to the home directory.
 * Returns `undefined` when nothing is configured.
 */
export function resolveGhqBinary(configuredPath: string | undefined, home: string): string | undefined {
  const trimmed = configuredPath?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === "~") {
    return home;
  }
  if (trimmed.startsWith("~/")) {
    return path.join(home, trimmed.slice(2));
  }
  return trimmed;
}

/** Runs the ghq binary with the given arguments and resolves with its stdout. */
export type GhqExecutor = (args: string[]) => Promise<string>;

/** Creates a {@link GhqExecutor} bound to an absolute path of the ghq binary. */
export function createGhqExecutor(binary: string): GhqExecutor {
  return async (args) => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { stdout } = await promisify(execFile)(binary, args, { encoding: "utf8", timeout: 10_000 });
    return stdout;
  };
}

/** Lists every repository known to ghq, resolved against all configured ghq roots. */
export async function listRepositories(exec: GhqExecutor): Promise<Repository[]> {
  const [rootsOutput, listOutput] = await Promise.all([exec(["root", "--all"]), exec(["list", "--full-path"])]);
  return toRepositories(parseLines(rootsOutput), parseLines(listOutput));
}
