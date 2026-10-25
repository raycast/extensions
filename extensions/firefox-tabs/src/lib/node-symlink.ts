import { lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from "fs";
import { dirname } from "path";

/**
 * Point `linkPath` at `target`, replacing whatever link or file is there.
 *
 * The existing entry is found with lstat, not existsSync: existsSync follows
 * the link, so a link whose target has gone (Raycast moves its bundled Node
 * runtime between versions) looks absent, is never removed, and creating
 * the new link then fails with EEXIST. A directory at `linkPath` is left
 * alone and the error is thrown.
 */
export function replaceSymlink(target: string, linkPath: string): void {
  mkdirSync(dirname(linkPath), { recursive: true });

  let existing: ReturnType<typeof lstatSync> | undefined;
  try {
    existing = lstatSync(linkPath);
  } catch {
    // Nothing there
  }
  if (existing?.isDirectory()) {
    throw new Error(`${linkPath} is a directory, expected a link to Node.js`);
  }
  if (existing) unlinkSync(linkPath);

  symlinkSync(target, linkPath);
}

/**
 * Make `linkPath` point at `target` unless it already does. Returns whether
 * the link was changed. Raycast can move its bundled Node.js at any time, so
 * this runs whenever a command opens, not only when installing.
 */
export function ensureSymlink(target: string, linkPath: string): boolean {
  try {
    if (readlinkSync(linkPath) === target) return false;
  } catch {
    // Missing, or not a link
  }
  replaceSymlink(target, linkPath);
  return true;
}
