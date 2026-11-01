import { lstatSync, mkdirSync, readlinkSync, renameSync, rmSync, symlinkSync } from "fs";
import { dirname } from "path";

/**
 * Point `linkPath` at `target`, replacing whatever link or file is there.
 *
 * The existing entry is found with lstat, not existsSync: existsSync follows
 * the link, so a link whose target has gone (Raycast moves its bundled Node
 * runtime between versions) looks absent. The new link is created under a
 * temporary name and renamed over the old one, which is atomic, so two
 * commands doing this at once can't fail on each other. A directory at
 * `linkPath` is left alone and the error is thrown.
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

  const temporary = `${linkPath}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  symlinkSync(target, temporary);
  try {
    renameSync(temporary, linkPath);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
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
