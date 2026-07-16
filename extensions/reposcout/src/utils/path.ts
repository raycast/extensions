import { homedir } from "node:os";
import { isAbsolute, normalize, resolve, sep } from "node:path";

/**
 * Pure path helpers. No filesystem access happens here — these are string
 * transformations only, which keeps them trivially testable.
 */

/**
 * Expand a leading `~` (or `~/...`) to the user's home directory and resolve the
 * result to an absolute, normalized path. Non-tilde paths are resolved as-is.
 *
 * @param input A raw path that may start with `~`.
 * @param home  Home directory to expand against. Defaults to `os.homedir()`;
 *              injectable for tests.
 */
export function expandHome(input: string, home: string = homedir()): string {
  const trimmed = input.trim();
  if (trimmed === "~") {
    return normalize(home);
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith(`~${sep}`)) {
    return resolve(home, trimmed.slice(2));
  }
  return isAbsolute(trimmed) ? normalize(trimmed) : resolve(trimmed);
}

/**
 * Replace a leading home-directory prefix with `~` for compact display.
 *
 * @param path Absolute path to prettify.
 * @param home Home directory. Defaults to `os.homedir()`.
 */
export function contractHome(path: string, home: string = homedir()): string {
  const normalizedHome = normalize(home);
  if (path === normalizedHome) {
    return "~";
  }
  if (path.startsWith(normalizedHome + sep)) {
    return "~" + path.slice(normalizedHome.length);
  }
  return path;
}

/**
 * Count the number of path segments (directory depth) of an absolute path.
 * Used by the "short path" ranking signal. The root counts as depth 0.
 */
export function pathDepth(path: string): number {
  const normalized = normalize(path);
  const withoutTrailing = normalized.endsWith(sep) ? normalized.slice(0, -1) : normalized;
  const segments = withoutTrailing.split(sep).filter((segment) => segment.length > 0);
  return segments.length;
}

/**
 * Parse a user-provided list of paths separated by commas and/or newlines,
 * trimming blanks. Used to read the `searchRoots` and `ignoredDirectories`
 * preferences.
 */
export function parsePathList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
