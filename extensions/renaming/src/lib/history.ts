/**
 * Undo/History system for rename operations
 */

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { lstat, rename } from "fs/promises";
import path, { basename } from "path";
import type { HistoryOperation, RenameHistoryEntry } from "../types";
import { fileExists } from "./files";
import { isSameEntry } from "./paths";
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
 * Filesystem identity of the entry at `filePath`, or undefined when it cannot
 * be read. `dev:ino` survives renames on the same volume — which is the only
 * kind of move `fs.rename` can have performed. Uses `lstat`, not `stat`:
 * rename operates on the directory entry, so a symlink's identity is the link
 * itself, never its target — a dangling link still has an identity to record,
 * and two links to one target must not pass for each other.
 */
async function getFileId(filePath: string): Promise<string | undefined> {
  try {
    const stats = await lstat(filePath);
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return undefined;
  }
}

/** Verified write attempts before updateHistory reports the change unsaved. */
const MAX_HISTORY_WRITE_ATTEMPTS = 3;

/**
 * Read-mutate-write the stored history with optimistic verification.
 * LocalStorage has no transactions, so another command instance can write
 * between our read and our write. After writing, re-read: if the stored
 * payload is not the one we wrote, another writer won the race — re-apply the
 * mutator to its state and write again. Mutators must therefore be idempotent
 * over their own output (re-applying to an array that already contains the
 * change must not duplicate it).
 *
 * Returns true only for a write verified as stored. When every attempt loses
 * its race, returns false — the change may survive inside the winning
 * writer's merge, but that cannot be proven here, and callers must report
 * "not saved" rather than acknowledge a write this function watched being
 * overwritten.
 */
async function updateHistory(mutate: (fresh: RenameHistoryEntry[]) => RenameHistoryEntry[]): Promise<boolean> {
  try {
    for (let attempt = 0; attempt < MAX_HISTORY_WRITE_ATTEMPTS; attempt++) {
      const payload = JSON.stringify(mutate(await getHistory()));
      await LocalStorage.setItem(STORAGE_KEYS.HISTORY, payload);
      const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.HISTORY);
      if (stored === payload) return true;
    }
    log.history.error("History write lost every race; reporting the change unsaved");
    return false;
  } catch (error) {
    log.history.error("Failed to write history", { error });
    return false;
  }
}

/**
 * Save a rename operation to history (call AFTER successful rename)
 */
export async function saveToHistory(description: string, operations: RenameHistoryEntry["operations"]): Promise<void> {
  log.history.info("Saving to history", { description, operationCount: operations.length });

  // Capture each file's identity before touching storage, so the read→write
  // window inside updateHistory stays as small as possible.
  const stamped = await Promise.all(
    operations.map(async (op) => {
      const fileId = await getFileId(op.newPath);
      return fileId === undefined ? op : { ...op, fileId };
    }),
  );

  // Reassigned only by the timestamp-collision step below, so a retry of the
  // mutator recognises the copy an earlier attempt stored.
  let entry: RenameHistoryEntry = {
    timestamp: Date.now(),
    description,
    operations: stamped,
  };

  const saved = await updateHistory((fresh) => {
    // Idempotent under retry: our own entry may already be in the re-read
    // state, so drop it by value — never by timestamp alone, which would
    // discard a different entry that happened to share the millisecond.
    const ours = JSON.stringify(entry);
    const others = fresh.filter((e) => JSON.stringify(e) !== ours);

    // Date.now() is not unique: a concurrent command instance can stamp its
    // own entry in the same millisecond, and the timestamp is the entry's
    // identity throughout the UI (undoEntry, the detail view). Step ours
    // forward until it names only itself, keeping both entries. Idempotent:
    // once `others` no longer holds the collision, re-applying does nothing.
    while (others.some((e) => e.timestamp === entry.timestamp)) {
      entry = { ...entry, timestamp: entry.timestamp + 1 };
    }

    const next = [entry, ...others];
    if (next.length > MAX_HISTORY_ENTRIES) {
      next.length = MAX_HISTORY_ENTRIES;
    }
    return next;
  });
  if (!saved) {
    throw new Error("Failed to write history");
  }
}

/** True while the rename is still in effect and can be undone (or retried). */
export function isUndoable(op: HistoryOperation): boolean {
  return op.status !== "undone";
}

/**
 * Verify that the object currently at `newPath` is the file the operation
 * recorded. Returns a human-readable failure when it is not — or when that
 * cannot be proven. Identity must be verified, never assumed: an operation
 * recorded without a fileId, or a destination that cannot be statted, refuses
 * to undo rather than risk moving an unrelated file that took the same path.
 */
async function verifyIdentity(op: HistoryOperation, newPath: string): Promise<string | undefined> {
  if (op.fileId === undefined) {
    return `${basename(newPath)} has no recorded identity to verify`;
  }
  const current = await getFileId(newPath);
  if (current === undefined) {
    return `${basename(newPath)} could not be verified as the renamed file`;
  }
  if (current !== op.fileId) {
    return `${basename(newPath)} was replaced by a different file`;
  }
  return undefined;
}

/**
 * Try to revert one operation on disk, with the renamed file currently at
 * `newPath` (its recorded newPath remapped through any parent-directory
 * restores). Returns undefined on success, or a human-readable reason on
 * failure.
 */
async function revertOperation(op: HistoryOperation, newPath: string = op.newPath): Promise<string | undefined> {
  if (!(await fileExists(newPath))) {
    return `${basename(newPath)} not found`;
  }

  // A case-only rename resolves its own old spelling on a case-insensitive
  // volume — that is the file being restored, not an occupying conflict.
  if ((await fileExists(op.oldPath)) && !(await isSameEntry(newPath, op.oldPath))) {
    return `${basename(op.oldPath)} already exists`;
  }

  // Never move a file the rename didn't produce: if something else now sits
  // at the recorded destination — or identity cannot be proven — refuse.
  // Checked last, immediately before the rename, so the window in which the
  // source could be swapped is as narrow as this process can make it.
  //
  // Check-then-rename is not atomic (Node exposes no RENAME_NOREPLACE, and
  // the hardlink trick cannot cover directories), so two residual races are
  // accepted here: a file created at oldPath after the existence check is
  // overwritten, and a file substituted at newPath after this verification is
  // moved as though it were the renamed one. Both windows are microseconds of
  // syscall latency with no filesystem primitive available to close them; the
  // forward rename path accepts the same residual race.
  const identityFailure = await verifyIdentity(op, newPath);
  if (identityFailure !== undefined) {
    return identityFailure;
  }

  try {
    await rename(newPath, op.oldPath);
    return undefined;
  } catch (error) {
    log.history.error("Undo failed for file", { newPath, oldPath: op.oldPath, error });
    return `Failed to restore ${basename(op.oldPath)}: ${getUserFriendlyErrorMessage(error)}`;
  }
}

/** Depth of a path, for ordering parents before children. */
function pathDepth(p: string): number {
  return path.normalize(p).split(path.sep).length;
}

/** Rewrite `target` when it sits under `fromPrefix`, moving it under `toPrefix`. */
function reparent(target: string, fromPrefix: string, toPrefix: string): string {
  return target.startsWith(fromPrefix + path.sep) ? toPrefix + target.slice(fromPrefix.length) : target;
}

/**
 * Where each operation's renamed file actually sits now. A rename batch can
 * contain a directory and files inside it: undoing the directory carries its
 * children with it, so a child's recorded newPath goes stale the moment the
 * parent is restored. Replay every already-undone operation's restore,
 * shallowest-first, over the recorded paths to get the current locations.
 */
function effectiveNewPaths(operations: ReadonlyArray<HistoryOperation>): string[] {
  const effective = operations.map((op) => op.newPath);
  const undoneIndexes = operations
    .map((op, i) => i)
    .filter((i) => operations[i]!.status === "undone")
    .sort((a, b) => pathDepth(effective[a]!) - pathDepth(effective[b]!));

  for (const i of undoneIndexes) {
    const from = effective[i]!;
    const to = operations[i]!.oldPath;
    for (let j = 0; j < effective.length; j++) {
      if (j !== i) effective[j] = reparent(effective[j]!, from, to);
    }
    effective[i] = to;
  }
  return effective;
}

/**
 * An entry's operations with each newPath replaced by the file's current
 * location (see {@link effectiveNewPaths}) — what previews and single-file
 * undos must operate on.
 */
export function getEffectiveOperations(entry: RenameHistoryEntry): HistoryOperation[] {
  const effective = effectiveNewPaths(entry.operations);
  return entry.operations.map((op, i) => ({ ...op, newPath: effective[i]! }));
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
 * as the real undo, no renames. Pass operations from
 * {@link getEffectiveOperations} so paths reflect parent restores. A snapshot,
 * not a guarantee — the batch itself can free or occupy paths as it
 * progresses.
 */
export async function previewUndo(operations: ReadonlyArray<HistoryOperation>): Promise<UndoPreview> {
  let restorable = 0;
  let missing = 0;
  let occupied = 0;
  let replaced = 0;

  for (const op of operations) {
    if (!isUndoable(op)) continue;
    // Same order of checks as revertOperation, so an operation blocked by
    // more than one conflict is previewed under the reason the undo reports.
    if (!(await fileExists(op.newPath))) {
      missing++;
    } else if ((await fileExists(op.oldPath)) && !(await isSameEntry(op.newPath, op.oldPath))) {
      occupied++;
    } else if ((await verifyIdentity(op, op.newPath)) !== undefined) {
      replaced++;
    } else {
      restorable++;
    }
  }

  return { restorable, missing, occupied, replaced, total: restorable + missing + occupied + replaced };
}

/**
 * Human-readable confirmation message for an undo about to cover `preview`.
 * Says "items", not "files": an entry records whatever its command renamed —
 * files, folders, or (from Advanced Batch Rename) a mix — and the entry does
 * not store which.
 */
export function describeUndoPreview(preview: UndoPreview, source: string): string {
  if (preview.missing === 0 && preview.occupied === 0 && preview.replaced === 0) {
    return `This will restore the original names of ${preview.total} item${preview.total !== 1 ? "s" : ""} from ${source}`;
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
      `${preview.replaced} ${preview.replaced === 1 ? "is" : "are"} not verifiably the renamed item${preview.replaced === 1 ? "" : "s"}`,
    );
  }
  return (
    `${preview.restorable} of ${preview.total} item${preview.total !== 1 ? "s" : ""} from ${source} can be restored. ` +
    `${conflicts.join("; ")}. Conflicted items will be skipped and can be retried later.`
  );
}

interface EntryUndoResult {
  readonly operations: HistoryOperation[];
  readonly successCount: number;
  readonly attemptedCount: number;
  readonly errors: string[];
}

/**
 * Revert one entry's operations on disk. Operations already undone are
 * skipped, and previously failed ones are retried.
 *
 * Order mirrors batchRename in reverse: the forward pass renames children
 * before parents, so the undo restores parents before children — shallowest
 * first, ties in reverse input order. Each successful directory restore
 * carries its children with it, so the remaining operations' current paths
 * are remapped as the loop progresses (seeded by effectiveNewPaths with the
 * restores already-undone operations performed earlier).
 */
async function undoEntryOperations(entry: RenameHistoryEntry): Promise<EntryUndoResult> {
  const newOps: HistoryOperation[] = [...entry.operations];
  const effective = effectiveNewPaths(entry.operations);
  const errors: string[] = [];
  let successCount = 0;
  let attemptedCount = 0;

  const order = entry.operations
    .map((op, i) => i)
    .filter((i) => isUndoable(entry.operations[i]!))
    .sort((a, b) => pathDepth(effective[a]!) - pathDepth(effective[b]!) || b - a);

  for (const i of order) {
    const op = entry.operations[i]!;
    attemptedCount++;
    const failure = await revertOperation(op, effective[i]!);
    if (failure === undefined) {
      successCount++;
      newOps[i] = { ...op, status: "undone", undoError: undefined };
      for (let j = 0; j < effective.length; j++) {
        if (j !== i) effective[j] = reparent(effective[j]!, effective[i]!, op.oldPath);
      }
      effective[i] = op.oldPath;
    } else {
      errors.push(failure);
      newOps[i] = { ...op, status: "undo-failed", undoError: failure };
    }
  }

  return { operations: newOps, successCount, attemptedCount, errors };
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
 * Persist undo results by merging only the operations this undo touched into
 * the freshest stored history (via updateHistory's verified read-mutate-write).
 * Filesystem work in an undo can take a while; anything another command
 * instance recorded or undid in the meantime must survive the write instead
 * of being clobbered by our stale snapshot. Returns false instead of
 * throwing: by the time this runs the files have already been restored on
 * disk, so a storage failure must not make the undo look like it never
 * happened.
 */
async function persistUndoResults(updatedEntries: ReadonlyArray<RenameHistoryEntry>): Promise<boolean> {
  const updated = new Map(updatedEntries.map((e) => [e.timestamp, e]));
  return updateHistory((fresh) =>
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

async function showEntryGoneToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Entry No Longer in History",
    message: "It may have been trimmed or cleared since this view was opened",
  });
}

/**
 * Find an entry by its timestamp — the entry's identity. Callers hold
 * snapshots of the list, and an index into a snapshot goes stale the moment
 * another command records a rename (entries unshift to the front) or history
 * is trimmed; the timestamp still names the same entry in the fresh read.
 */
function findEntryIndex(history: ReadonlyArray<RenameHistoryEntry>, timestamp: number): number {
  return history.findIndex((e) => e.timestamp === timestamp);
}

/**
 * Undo to a specific point in history: reverses the entry with the given
 * timestamp and every entry newer than it. Entries stay in history with each
 * operation marked "undone" or "undo-failed"; operations already undone are
 * skipped, and previously failed ones are retried.
 */
export async function undoToPoint(timestamp: number): Promise<boolean> {
  const history = await getHistory();
  const index = findEntryIndex(history, timestamp);

  if (index < 0) {
    await showEntryGoneToast();
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
 * Undo the entry with the given timestamp, leaving newer and older entries
 * untouched. This is the detail view's "undo this operation" — unlike
 * undoToPoint it never reaches beyond the selected entry.
 */
export async function undoEntry(timestamp: number): Promise<boolean> {
  const history = await getHistory();
  const entry: RenameHistoryEntry | undefined = history[findEntryIndex(history, timestamp)];

  if (!entry) {
    await showEntryGoneToast();
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
 * Undo the rename of a single file within the entry with the given timestamp.
 * The operation is marked "undone" on success or "undo-failed" with the
 * reason; the entry itself stays in history.
 */
export async function undoFileOperation(timestamp: number, opIndex: number): Promise<boolean> {
  const history = await getHistory();
  const entry: RenameHistoryEntry | undefined = history[findEntryIndex(history, timestamp)];
  const op = entry?.operations[opIndex];

  if (!entry || !op) {
    await showEntryGoneToast();
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

  // The file may have moved with an already-restored parent directory from
  // the same batch — undo it from where it actually sits now.
  const failure = await revertOperation(op, effectiveNewPaths(entry.operations)[opIndex]!);
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
