import { exportSignatures, syncExportEntry } from "./export-sync";
import fs from "node:fs";
import path from "node:path";
import { statePaths } from "./env";
import { ownerAlive } from "./liveness";
import { ActiveWorkerState, ClipInState, HistoryEntry, QueueTask } from "./types";

import { readJson, writeJson, transaction } from "./state-store";

export { transaction as withTaskStateLock } from "./state-store";

export function activeTaskFile(supportPath: string, id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid task ID");
  return path.join(supportPath, "active-tasks", `${id}.json`);
}
const MAX_HISTORY_ITEMS = 40;

const readJsonSafe = readJson;
const writeJsonAtomic = writeJson;

export function readQueue(supportPath: string): QueueTask[] {
  return readJsonSafe<QueueTask[]>(statePaths(supportPath).queueFile, []);
}

/** Whole-queue replacement. Wrap any read/modify/save sequence in
 * withTaskStateLock; prefer enqueueTask/removeQueuedTask for UI mutations. */
export function saveQueue(supportPath: string, tasks: QueueTask[]): void {
  transaction(supportPath, () => writeJsonAtomic(statePaths(supportPath).queueFile, tasks));
}

export function enqueueTask(supportPath: string, task: QueueTask): { shots: number; clips: number } {
  return transaction(supportPath, () => {
    const queue = readQueue(supportPath);
    // Each invocation has its own ID, even at the exact same playback time.
    // Only replaying the same task ID is idempotent; media reuse happens below the queue.
    if (
      !queue.some((item) => item.id === task.id) &&
      !listActiveTasks(supportPath).some((item) => item.task.id === task.id)
    )
      queue.push(task);
    saveQueue(supportPath, queue);
    return {
      shots: queue.filter((t) => t.type === "screenshot").length,
      clips: queue.filter((t) => t.type === "clip").length,
    };
  });
}

export function removeQueuedTask(supportPath: string, taskId: string): void {
  transaction(supportPath, () =>
    saveQueue(
      supportPath,
      readQueue(supportPath).filter((t) => t.id !== taskId),
    ),
  );
}

/** Tasks whose command is still running, oldest first. */
export function listActiveTasks(supportPath: string): ActiveWorkerState[] {
  return transaction(supportPath, () => {
    const dir = path.join(supportPath, "active-tasks");
    const states = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((file) => file.endsWith(".json"))
          .map((file) => readJsonSafe<ActiveWorkerState | null>(path.join(dir, file), null))
          .filter((state): state is ActiveWorkerState => !!state && ownerAlive(supportPath, state.owner))
      : [];
    return states.sort((a, b) => a.startedAt - b.startedAt || a.task.id.localeCompare(b.task.id));
  });
}

/** Tasks left unfinished by a command Raycast unloaded; the next queue run picks them up again. */
export function listInterruptedTasks(supportPath: string): ActiveWorkerState[] {
  type State = ActiveWorkerState & { phase?: string; failureRecorded?: boolean };
  const dir = path.join(supportPath, "active-tasks");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJsonSafe<State | null>(path.join(dir, file), null))
    .filter(
      (state): state is State =>
        !!state && state.phase !== "finished" && !state.failureRecorded && !ownerAlive(supportPath, state.owner),
    )
    .sort((a, b) => a.startedAt - b.startedAt);
}

export function discardInterruptedTask(supportPath: string, taskId: string): void {
  transaction(supportPath, () => {
    if (listInterruptedTasks(supportPath).some((state) => state.task.id === taskId))
      fs.rmSync(activeTaskFile(supportPath, taskId), { force: true });
  });
}

export function getStopRequestState(supportPath: string, taskId: string): "none" | "requested" | "stopping" {
  if (fs.existsSync(path.join(supportPath, `stopping-${taskId}.json`))) return "stopping";
  return fs.existsSync(path.join(supportPath, `cancel-${taskId}.json`)) ? "requested" : "none";
}

export function cancelTaskStop(supportPath: string, taskId: string): void {
  // Atomically compete with the worker claiming the request via rename.
  const request = path.join(supportPath, `cancel-${taskId}.json`);
  const withdrawn = path.join(supportPath, `withdrawn-${taskId}.json`);
  try {
    fs.renameSync(request, withdrawn);
  } catch {
    throw new Error(
      "The background task is already stopping, or the stop request no longer exists, so it can't be undone.",
    );
  }
  fs.rmSync(withdrawn, { force: true });
}

export function requestTaskStop(supportPath: string, taskId?: string): void {
  transaction(supportPath, () => {
    const tasks = listActiveTasks(supportPath);
    const active = taskId === undefined ? tasks[0] : tasks.find((item) => item.task.id === taskId);
    if (!active) throw new Error("No task is currently running");
    if (getStopRequestState(supportPath, active.task.id) !== "none") return;
    writeJsonAtomic(path.join(supportPath, `cancel-${active.task.id}.json`), {});
  });
}

export function readHistory(supportPath: string): HistoryEntry[] {
  return readJsonSafe<HistoryEntry[]>(statePaths(supportPath).historyFile, [])
    .map(syncExportEntry)
    .filter((entry): entry is HistoryEntry => !!entry);
}

export function appendHistory(supportPath: string, entry: HistoryEntry): void {
  transaction(supportPath, () => {
    const filtered = readHistory(supportPath).filter((item) => item.id !== entry.id);
    filtered.unshift(entry.status === "failed" ? entry : { ...entry, exportSignatures: exportSignatures(entry) });
    writeJsonAtomic(
      statePaths(supportPath).historyFile,
      filtered.filter((item, index) => item.status === "failed" || index < MAX_HISTORY_ITEMS),
    );
  });
}

export function deleteHistoryEntry(supportPath: string, entryId: string): void {
  transaction(supportPath, () =>
    writeJsonAtomic(
      statePaths(supportPath).historyFile,
      readHistory(supportPath).filter((item) => item.id !== entryId),
    ),
  );
}

/** Refresh an existing row in place (subtitle compose finishes later than the
 * capture). Missing rows fall back to inserting so a late result is never lost. */
export function updateHistoryEntry(supportPath: string, entry: HistoryEntry): void {
  transaction(supportPath, () => {
    const history = readHistory(supportPath);
    const index = history.findIndex((item) => item.id === entry.id);
    if (index < 0) {
      history.unshift({ ...entry, exportSignatures: exportSignatures(entry) });
    } else {
      history[index] = { ...history[index], ...entry, exportSignatures: exportSignatures(entry) };
    }
    writeJsonAtomic(
      statePaths(supportPath).historyFile,
      history.filter((item, i) => item.status === "failed" || i < MAX_HISTORY_ITEMS),
    );
  });
}

export function clearFailedHistory(supportPath: string): void {
  transaction(supportPath, () =>
    writeJsonAtomic(
      statePaths(supportPath).historyFile,
      readHistory(supportPath).filter((item) => item.status !== "failed"),
    ),
  );
}

export function readClipInState(supportPath: string): ClipInState | null {
  return readJsonSafe<ClipInState | null>(statePaths(supportPath).clipInFile, null);
}

export function writeClipInState(supportPath: string, state: ClipInState): void {
  writeJsonAtomic(statePaths(supportPath).clipInFile, state);
}

export function clearClipInState(supportPath: string): void {
  fs.rmSync(statePaths(supportPath).clipInFile, { force: true });
}
