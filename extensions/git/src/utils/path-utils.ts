import { realpathSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Resolves a tilde (~) path to an absolute path.
 * @param path - The path, which may start with ~.
 * @returns The absolute path.
 */
export function resolveTildePath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  if (path === "~") {
    return homedir();
  }
  return path;
}

/**
 * Resolves symlinks in a path, falling back to the given path when it cannot be resolved.
 * Required to compare paths from different sources, as Git always reports resolved paths.
 * @param path - The path to resolve.
 * @returns The path with resolved symlinks.
 */
export function realPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Replace full path with tilde path.
 * @param path - The path to replace.
 * @returns The replaced path.
 */
export function prettyPath(path: string): string {
  return path.replace(homedir(), "~");
}
