/**
 * Atomic JSON file utilities for cross-command state.
 *
 * Every Raycast command runs in its own worker thread; files under
 * environment.supportPath are the only shared state between them. Writes must be
 * atomic (other commands may poll at any moment) and resilient to transient
 * Windows locking (antivirus/indexer briefly opening files).
 *
 * This module is pure (no @raycast/api import): all functions take absolute
 * paths so the protocol logic is unit-testable against a temp directory.
 * Production code resolves paths via core/paths.ts.
 */

import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";

const RETRY_DELAYS_MS = [50, 100, 200];

function sleepSync(ms: number): void {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, ms);
}

function isTransientFsError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "EPERM" || code === "EBUSY" || code === "EACCES" || code === "EMFILE";
}

/** Run an fs operation with bounded retries for transient Windows errors. */
function withRetries<T>(operation: () => T): T {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      if (!isTransientFsError(error) || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }
      sleepSync(RETRY_DELAYS_MS[attempt]!);
    }
  }
  throw lastError;
}

/**
 * Atomically replace a JSON file: write a uniquely-named temp file in the same
 * directory, then rename over the destination (MoveFileEx semantics — atomic on
 * NTFS). Unique temp names prevent two writers from renaming each other's
 * half-written temp files.
 */
function writeJsonAtomic(filePath: string, value: unknown): void {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const payload = JSON.stringify(value);

  withRetries(() => {
    const fd = openSync(tempPath, "w");
    try {
      writeSync(fd, payload, null, "utf-8");
    } finally {
      closeSync(fd);
    }
  });

  try {
    withRetries(() => renameSync(tempPath, filePath));
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
      // best effort; orphan tmp files are reaped by cleanupOrphanTempFiles
    }
    throw error;
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Best-effort delete; treat "already gone" and "held open" alike. */
function deleteFileQuiet(filePath: string): void {
  try {
    withRetries(() => unlinkSync(filePath));
  } catch {
    // callers treat deletion as best-effort
  }
}

/** mtime in ms, or null if the file does not exist. */
function fileMtime(filePath: string): number | null {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Remove sibling *.tmp files older than an hour (crashed writers) and
 * op-request-*.json files older than a day (requests whose runner launch
 * never consumed them; they are one-shot by id and accumulate forever
 * otherwise).
 */
function cleanupOrphanTempFiles(anyFileInDir: string): void {
  try {
    const dir = dirname(anyFileInDir);
    const tmpCutoff = Date.now() - 60 * 60 * 1000;
    const requestCutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const entry of readdirSync(dir)) {
      const isTmp = entry.endsWith(".tmp");
      const isRequest = entry.startsWith("op-request-") && entry.endsWith(".json");
      if (!isTmp && !isRequest) {
        continue;
      }
      const fullPath = join(dir, entry);
      try {
        if (statSync(fullPath).mtimeMs < (isTmp ? tmpCutoff : requestCutoff)) {
          unlinkSync(fullPath);
        }
      } catch {
        // ignore individual failures
      }
    }
  } catch {
    // directory unreadable; nothing to do
  }
}

export { cleanupOrphanTempFiles, deleteFileQuiet, fileExists, fileMtime, readJson, withRetries, writeJsonAtomic };
