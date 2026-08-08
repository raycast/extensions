/**
 * Undo/History system for rename operations
 */

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { rename, stat } from "fs/promises";
import { basename } from "path";
import type { HistoryOperation, RenameHistoryEntry } from "../types";
import { fileExists } from "./files";
import { MAX_HISTORY_ENTRIES, STORAGE_KEYS } from "./constants";
import { getUserFriendlyErrorMessage } from "./errors";
import { log } from "./logger";

/**
 * Get all history entries
 */
export async function getHistory(): Promise<RenameHistoryEntry[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.HISTORY);
  if (!data) return [];

  try {
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Drop malformed entries (older versions, truncated writes) instead of
    // letting a typed cast hand callers objects whose .operations throws.
    return parsed.filter(
      (entry): entry is RenameHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { timestamp?: unknown }).timestamp === "number" &&
        Array.isArray((entry as { operations?: unknown }).operations),
    );
  } catch {
    return [];
  }
}

/**
 * Filesystem identity of the file at `path`, or undefined when it cannot be
 * read. `dev:ino` survives renames on the same volume — which is the only
 * kind of move `fs.rename` can have performed.
 */
async function getFileId(path: string): Promise<string | undefined> {
  try {
    const stats = await stat(path);
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return undefined;
  }
}

/**
 * Save a rename operation to history (call AFTER successful rename)
 */
export async function saveToHistory(description: string, operations: RenameHistoryEntry["operations"]): Promise<void> {
  log.history.info("Saving to history", { description, operationCount: operations.length });

  // Capture each file's identity before touching storage, so the read→write
  // window below stays as small as possible.
  const stamped = await Promise.all(
    operations.map(async (op) => {
      const fileId = await getFileId(op.newPath);
      return fileId === undefined ? op : { ...op, fileId };
    }),
  );

  const history = await getHistory();

  history.unshift({
    timestamp: Date.now(),
    description,
    operations: stamped,
  });

  // Trim to max entries
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }

  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

/** True while the rename is still in effect and can be undone (or retried). */
export function isUndoable(op: HistoryOperation): boolean {
  return op.status !== "undone";
}

/**
 * Write history back to storage. Returns false instead of throwing: by the
 * time this runs the files have already been renamed on disk, so a storage
 * failure must not make the undo look like it never happened.
 */
async function persistHistory(history: ReadonlyArray<RenameHistoryEntry>): Promise<boolean> {
  try {
    await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    log.history.error("Failed to persist history after undo", { error });
    return false;
  }
}

/**
 * Verify that the object currently at `op.newPath` is the file the operation
 * recorded. Returns a human-readable failure when it is not — or when that
 * cannot be proven. Identity must be verified, never assumed: an operation
 * recorded without a fileId, or a destination that cannot be statted, refuses
 * to undo rather than risk moving an unrelated file that took the same path.
 */
async function verifyIdentity(op: HistoryOperation): Promise<string | undefined> {
  if (op.fileId === undefined) {
    return `${basename(op.newPath)} has no recorded identity to verify`;
  }
  const current = await getFileId(op.newPath);
  if (current === undefined) {
    return `${basename(op.newPath)} could not be verified as the renamed file`;
  }
  if (current !== op.fileId) {
    return `${basename(op.newPath)} was replaced by a different file`;
  }
  return undefined;
}

/**
 * Try to revert one operation on disk. Returns undefined on success,
 * or a human-readable reason on failure.
 */
async function revertOperation(op: HistoryOperation): Promise<string | undefined> {
  if (!(await fileExists(op.newPath))) {
    return `${basename(op.newPath)} not found`;
  }

  // Never move a file the rename didn't produce: if something else now sits
  // at the recorded destination — or identity cannot be proven — refuse.
  const identityFailure = await verifyIdentity(op);
  if (identityFailure !== undefined) {
    return identityFailure;
  }

  if (await fileExists(op.oldPath)) {
    return `${basename(op.oldPath)} already exists`;
  }

  try {
    await rename(op.newPath, op.oldPath);
    return undefined;
  } catch (error) {
    log.history.error("Undo failed for file", { newPath: op.newPath, oldPath: op.oldPath, error });
    return `Failed to restore ${basename(op.oldPath)}: ${getUserFriendlyErrorMessage(error)}`;
  }
}

export interface UndoPreview {
  /** Operations expected to restore cleanly */
  readonly restorable: number;
  /** Renamed file no longer at its new path (moved or deleted since) */
  readonly missing: number;
  /** Original name taken again by another file */
  readonly occupied: number;
  /** A different file sits at the recorded destination, or identity cannot be verified */
  readonly replaced: number;
  readonly total: number;
}

/**
 * Dry-run the undo of a set of operations: same existence and identity checks
 * as the real undo, no renames. A snapshot, not a guarantee — the batch
 * itself can free or occupy paths as it progresses.
 */
export async function previewUndo(operations: ReadonlyArray<HistoryOperation>): Promise<UndoPreview> {
  let restorable = 0;
  let missing = 0;
  let occupied = 0;
  let replaced = 0;

  for (const op of operations) {
    if (!isUndoable(op)) continue;
    if (!(await fileExists(op.newPath))) {
      missing++;
    } else if ((await verifyIdentity(op)) !== undefined) {
      replaced++;
    } else if (await fileExists(op.oldPath)) {
      occupied++;
    } else {
      restorable++;
    }
  }

  return { restorable, missing, occupied, replaced, total: restorable + missing + occupied + replaced };
}

/**
 * Human-readable confirmation message for an undo about to cover `preview`.
 */
export function describeUndoPreview(preview: UndoPreview, source: string): string {
  if (preview.missing === 0 && preview.occupied === 0 && preview.replaced === 0) {
    return `This will restore the original names of ${preview.total} file${preview.total !== 1 ? "s" : ""} from ${source}`;
  }

  const conflicts: string[] = [];
  if (preview.missing > 0) {
    conflicts.push(`${preview.missing} ${preview.missing === 1 ? "was" : "were"} moved or deleted`);
  }
  if (preview.occupied > 0) {
    conflicts.push(`${preview.occupied} ${preview.occupied === 1 ? "has" : "have"} the original name taken`);
  }
  if (preview.replaced > 0) {
    conflicts.push(
      `${preview.replaced} ${preview.replaced === 1 ? "is" : "are"} not verifiably the renamed file${preview.replaced === 1 ? "" : "s"}`,
    );
  }
  return (
    `${preview.restorable} of ${preview.total} file${preview.total !== 1 ? "s" : ""} from ${source} can be restored. ` +
    `${conflicts.join("; ")}. Conflicted files will be skipped and can be retried later.`
  );
}

interface EntryUndoResult {
  readonly operations: HistoryOperation[];
  readonly successCount: number;
  readonly attemptedCount: number;
  readonly errors: string[];
}

/**
 * Revert one entry's operations on disk, newest-first. Operations already
 * undone are skipped, and previously failed ones are retried.
 */
async function undoEntryOperations(entry: RenameHistoryEntry): Promise<EntryUndoResult> {
  const newOps: HistoryOperation[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let attemptedCount = 0;

  for (const op of [...entry.operations].reverse()) {
    if (!isUndoable(op)) {
      newOps.push(op);
      continue;
    }

    attemptedCount++;
    const failure = await revertOperation(op);
    if (failure === undefined) {
      successCount++;
      newOps.push({ ...op, status: "undone", undoError: undefined });
    } else {
      errors.push(failure);
      newOps.push({ ...op, status: "undo-failed", undoError: failure });
    }
  }

  return { operations: newOps.reverse(), successCount, attemptedCount, errors };
}

/**
 * Merge two views of one entry's operations, per operation. "undone" reflects
 * completed disk work and always wins; "undo-failed" beats no status. This
 * lets two instances undo different files of the same entry without the later
 * write reverting the earlier one's result.
 */
function mergeOperations(
  fresh: ReadonlyArray<HistoryOperation>,
  ours: ReadonlyArray<HistoryOperation>,
): HistoryOperation[] {
  return fresh.map((freshOp, i) => {
    const ourOp = ours[i];
    if (!ourOp) return freshOp;
    if (ourOp.status === "undone") return ourOp;
    if (freshOp.status === "undone") return freshOp;
    if (ourOp.status === "undo-failed") return ourOp;
    return freshOp;
  });
}

/**
 * Persist undo results by re-reading the latest history and merging in only
 * the operations this undo touched. Filesystem work in an undo can take a
 * while; anything another command instance recorded or undid in the meantime
 * must survive the write instead of being clobbered by our stale snapshot.
 * (The read→write below is not atomic — LocalStorage has no transactions —
 * but merging over the freshest read shrinks the race to one storage
 * round-trip and can no longer revert another instance's completed undo.)
 */
async function persistUndoResults(updatedEntries: ReadonlyArray<RenameHistoryEntry>): Promise<boolean> {
  const updated = new Map(updatedEntries.map((e) => [e.timestamp, e]));
  const fresh = await getHistory();
  return persistHistory(
    fresh.map((e) => {
      const ours = updated.get(e.timestamp);
      return ours === undefined ? e : { ...e, operations: mergeOperations(e.operations, ours.operations) };
    }),
  );
}

/**
 * Persist the post-undo history and report the outcome. The files are already
 * reverted on disk at this point, so the return value reflects the disk work
 * even when the history write fails.
 */
async function finishUndo(
  updatedEntries: ReadonlyArray<RenameHistoryEntry>,
  operationsText: string,
  { successCount, attemptedCount, errors }: Omit<EntryUndoResult, "operations">,
): Promise<boolean> {
  const persisted = await persistUndoResults(updatedEntries);

  if (!persisted && successCount > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo Finished, History Not Updated",
      message: `Restored ${successCount} file${successCount !== 1 ? "s" : ""}, but the history could not be saved — entries may still show as renamed`,
    });
    return true;
  }

  if (errors.length === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "Undo Successful",
      message: `Reverted ${operationsText} (${successCount} file${successCount !== 1 ? "s" : ""})`,
    });
    return true;
  } else if (successCount > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Partial Undo",
      message: `Reverted ${successCount}/${attemptedCount} files. ${errors.slice(0, 2).join("; ")}`,
    });
    return true;
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Undo Failed",
      message: errors.slice(0, 2).join("; "),
    });
    return false;
  }
}

async function showNothingToUndoToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Nothing to Undo",
    message: "All files in this range are already undone",
  });
}

/**
 * Undo to a specific point in history: reverses the selected entry and every
 * entry newer than it. Entries stay in history with each operation marked
 * "undone" or "undo-failed"; operations already undone are skipped, and
 * previously failed ones are retried.
 */
export async function undoToPoint(index: number): Promise<boolean> {
  const history = await getHistory();

  if (index < 0 || index >= history.length) {
    return false;
  }

  const errors: string[] = [];
  let successCount = 0;
  let attemptedCount = 0;

  const updatedEntries: RenameHistoryEntry[] = [];
  for (let i = 0; i <= index; i++) {
    const entry = history[i]!;
    const result = await undoEntryOperations(entry);
    successCount += result.successCount;
    attemptedCount += result.attemptedCount;
    errors.push(...result.errors);
    updatedEntries.push({ ...entry, operations: result.operations });
  }

  if (attemptedCount === 0) {
    await showNothingToUndoToast();
    return false;
  }

  const operationsText = `${index + 1} operation${index > 0 ? "s" : ""}`;
  return finishUndo(updatedEntries, operationsText, { successCount, attemptedCount, errors });
}

/**
 * Undo a single entry, leaving newer and older entries untouched. This is the
 * detail view's "undo this operation" — unlike undoToPoint it never reaches
 * beyond the selected entry.
 */
export async function undoEntry(index: number): Promise<boolean> {
  const history = await getHistory();
  const entry = history[index];

  if (!entry) {
    return false;
  }

  const result = await undoEntryOperations(entry);
  if (result.attemptedCount === 0) {
    await showNothingToUndoToast();
    return false;
  }

  return finishUndo([{ ...entry, operations: result.operations }], "1 operation", result);
}

/**
 * Undo the rename of a single file within a history entry. The operation is
 * marked "undone" on success or "undo-failed" with the reason; the entry
 * itself stays in history.
 */
export async function undoFileOperation(entryIndex: number, opIndex: number): Promise<boolean> {
  const history = await getHistory();
  const entry = history[entryIndex];
  const op = entry?.operations[opIndex];

  if (!entry || !op) {
    return false;
  }

  if (!isUndoable(op)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Already Undone",
      message: `${basename(op.oldPath)} has its original name`,
    });
    return false;
  }

  const failure = await revertOperation(op);
  const newOp: HistoryOperation =
    failure === undefined
      ? { ...op, status: "undone", undoError: undefined }
      : { ...op, status: "undo-failed", undoError: failure };

  const updatedEntry: RenameHistoryEntry = {
    ...entry,
    operations: entry.operations.map((o, j) => (j === opIndex ? newOp : o)),
  };
  const persisted = await persistUndoResults([updatedEntry]);

  if (failure === undefined) {
    if (!persisted) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo Finished, History Not Updated",
        message: `Restored ${basename(op.oldPath)}, but the history could not be saved — it may still show as renamed`,
      });
      return true;
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Undo Successful",
      message: `Restored ${basename(op.oldPath)}`,
    });
    return true;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Undo Failed",
    message: failure,
  });
  return false;
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.HISTORY);
}
