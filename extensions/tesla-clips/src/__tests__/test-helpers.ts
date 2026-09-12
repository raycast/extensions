/**
 * Shared filesystem fixtures for tests that exercise merge/cleanup readiness against real temp dirs.
 */

import { mkdtemp, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** A fresh temp dir with a standard `<eventDir>/merged` subdirectory already created. */
export type EventDirFixture = { readonly tempDir: string; readonly eventDir: string; readonly mergedDir: string };

/**
 * Creates a fresh temp dir with a single event directory and its `merged` subdirectory.
 *
 * @param prefix - Temp directory name prefix, used to distinguish fixtures across test files.
 * @returns Created temp dir, event dir, and merged output dir paths.
 */
export async function setupEventDirWithMergedOutput(prefix: string): Promise<EventDirFixture> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  const eventDir = path.join(tempDir, "2025-09-29_07-01-59");
  const mergedDir = path.join(eventDir, "merged");
  await mkdir(mergedDir, { recursive: true });
  return { tempDir, eventDir, mergedDir };
}
