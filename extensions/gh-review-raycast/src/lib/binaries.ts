/**
 * Raycast launches Node with a minimal PATH, so `which` alone is unreliable
 * for finding CLI tools. These helpers check the usual install locations.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";

/** Directories searched for a CLI binary, in order. */
const BIN_DIRS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/opt/local/bin",
  "/home/linuxbrew/.linuxbrew/bin",
  `${homedir()}/.local/bin`,
  `${homedir()}/bin`,
];

/** A PATH generous enough for the tools we shell out to and their helpers. */
export const PATH_ENV = [...BIN_DIRS, process.env.PATH ?? ""].filter(Boolean).join(":");

const cache = new Map<string, string | undefined>();

/** Returns the absolute path to `name`, or undefined when it isn't installed. */
export function findBinary(name: string): string | undefined {
  if (cache.has(name)) return cache.get(name);
  const found = BIN_DIRS.map((dir) => `${dir}/${name}`).find((path) => existsSync(path));
  cache.set(name, found);
  return found;
}

/**
 * Drops the lookup cache. Needed when the user installs a tool while the
 * extension is open and asks it to check again — otherwise the negative result
 * would stick for the life of the process.
 */
export function clearBinaryCache(): void {
  cache.clear();
}
