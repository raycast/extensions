/**
 * Binds the shared-state filenames to absolute paths under the extension's
 * support directory. The only @raycast/api dependency in the storage chain, so
 * everything else in core/ stays unit-testable.
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { environment } from "@raycast/api";

const FILENAMES = {
  /** Global mutation mutex (see core/lock.ts protocol). */
  opLock: "op-lock.json",
  /** Live operation record; single writer = current lock owner. */
  opState: "op-state.json",
  /** Cancellation request keyed to op-lock.opId. */
  opCancel: "op-cancel.json",
  /** Last 20 terminal operation records. */
  opHistory: "op-history.json",
  /** The package index (schemaVersion 2 envelope). */
  index: "index.json",
  /** Short-lived mutex serializing every read-modify-write of index.json. */
  indexWriteLock: "index-write-lock.json",
  /** Mutex deduplicating concurrent index refreshes/rebuilds across views. */
  refreshLock: "refresh-lock.json",
  /** Timestamp of the newest acknowledged failure (last-failure surfacing). */
  failureAck: "failure-ack.json",
  /** Legacy v1 index file; migrated then deleted. */
  legacyIndex: "winget-package-index.json",
} as const;

type SupportFile = keyof typeof FILENAMES;

let supportDirEnsured = false;

function supportDir(): string {
  if (!supportDirEnsured) {
    mkdirSync(environment.supportPath, { recursive: true });
    supportDirEnsured = true;
  }
  return environment.supportPath;
}

function supportPath(file: SupportFile): string {
  return join(supportDir(), FILENAMES[file]);
}

/**
 * Lane-B request handoff file, one per request id — a second launch must
 * never overwrite an unconsumed first request.
 */
function requestPath(requestId: string): string {
  return join(supportDir(), `op-request-${requestId}.json`);
}

export { requestPath, supportPath, type SupportFile };
