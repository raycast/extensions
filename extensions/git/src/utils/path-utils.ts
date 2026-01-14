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
 * Replace full path with tilde path.
 * @param path - The path to replace.
 * @returns The replaced path.
 */
export function prettyPath(path: string): string {
  return path.replace(homedir(), "~");
}
