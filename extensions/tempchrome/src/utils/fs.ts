import { trash } from "@raycast/api";
import * as fs from "node:fs";

/**
 * Permanently removes a path. Reserved for automatic cleanup, where the user
 * did not ask for the deletion and so must not have the Trash filled for them.
 * Anything the user triggers goes through {@link trashPath} instead.
 */
export async function removePath(targetPath: string): Promise<void> {
  await fs.promises.rm(targetPath, { recursive: true, force: true });
}

/** Moves user-deleted profiles to the Trash so the deletion stays recoverable. */
export async function trashPath(targetPaths: string | string[]): Promise<void> {
  const paths = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
  if (paths.length === 0) {
    return;
  }
  await trash(paths);
}
