import { spawn } from "node:child_process";
import { exportSignatures, syncExportEntry } from "./export-sync";
import fs from "node:fs";
import path from "node:path";
import { resolveNodeBinary, statePaths } from "./env";
import { ActiveWorkerState, ClipInState, HistoryEntry, QueueTask, RuntimeConfig } from "./types";

import { alive, taskGroupAlive, readJson, writeJson, transaction } from "../worker/state-store";

export { transaction as withTaskStateLock } from "../worker/state-store";
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

export const isProcessAlive = alive;

/** Includes the live pre-dispatcher worker during migration, oldest task first. */
export function listActiveTasks(supportPath: string): ActiveWorkerState[] {
  return transaction(supportPath, () => {
    const dir = path.join(supportPath, "active-tasks");
    const states = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((file) => file.endsWith(".json"))
          .map((file) => readJsonSafe<ActiveWorkerState | null>(path.join(dir, file), null))
          .filter((state): state is ActiveWorkerState => !!state && taskGroupAlive(state.pid))
      : [];
    const legacy = readJsonSafe<ActiveWorkerState | null>(statePaths(supportPath).activeFile, null);
    if (legacy && isProcessAlive(legacy.pid) && !states.some((state) => state.task.id === legacy.task.id))
      states.push(legacy);
    return states.sort((a, b) => a.startedAt - b.startedAt || a.task.id.localeCompare(b.task.id));
  });
}

export function getWorkerStatus(supportPath: string): {
  workerAlive: boolean;
  pid: number | null;
  active: ActiveWorkerState | null;
} {
  const { lockFile } = statePaths(supportPath);
  let pid: number | null = null;
  let workerAlive = false;

  return transaction(supportPath, () => {
    try {
      const parsed = Number.parseInt(fs.readFileSync(lockFile, "utf-8").trim(), 10);
      if (isProcessAlive(parsed)) {
        pid = parsed;
        workerAlive = true;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const active = listActiveTasks(supportPath)[0] ?? null;
    return { workerAlive: workerAlive || !!active, pid: pid ?? active?.pid ?? null, active };
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

export async function spawnDetachedWorker(config: RuntimeConfig): Promise<void> {
  const workerScript = path.join(config.assetsPath, "worker.cjs");
  if (!fs.existsSync(workerScript)) {
    throw new Error(`Background worker bundle missing at ${workerScript}`);
  }

  const nodeBin = resolveNodeBinary();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(nodeBin, [workerScript, config.supportPath], {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", () =>
      reject(
        new Error(
          "Couldn't start the background process. Check your Node installation. The task is still queued and can be retried from the gallery.",
        ),
      ),
    );
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
