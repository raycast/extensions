import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { runWithCancellation } from "./command-runner";
import { statePaths } from "./env";
import { OWNER_ID, ownerAlive, pruneOwners, startHeartbeat } from "./liveness";
import { copyPngToClipboard, postMacNotification } from "./macos-native";
import { executeClipTask, executeComposeTask, executeScreenshotTask } from "./media-engine";
import { appendHistory, readHistory, readQueue, saveQueue, updateHistoryEntry, activeTaskFile } from "./queue";
import { readJson, transaction, writeJson } from "./state-store";
import { clearTemporaryStorage } from "./storage-maintenance";
import { ActiveWorkerState, CaptureProjectManifest, HistoryEntry, QueueTask } from "./types";

/** Captures are network bound, subtitle composition is CPU bound, clips stay serial. */
const LIMITS = { screenshot: 3, compose: 2, clip: 1 } as const;
/** A task interrupted this many times (Raycast unloading the command) is reported as failed. */
const MAX_ATTEMPTS = 5;

export interface TaskState extends ActiveWorkerState {
  phase?: "running" | "finished";
  attempts?: number;
  failureRecorded?: boolean;
}

/** Human-readable label so a failure row answers "what kind of task, where". */
function failureLabel(task: QueueTask): string {
  const hms = (sec: number) => {
    const safe = Math.max(0, sec);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  if (task.type === "clip") return `Clip ${hms(task.startSec)} → ${hms(task.endSec)} (${task.durationSec.toFixed(1)}s)`;
  if (task.type === "compose") return `Subtitle composite @ ${hms(task.probe.positionSec)}`;
  return `Frame @ ${hms(task.probe.positionSec)}`;
}

/** The capture row and manifest must not keep saying "composing" after compose stops. */
function markComposeFailed(supportPath: string, parentId: string, message: string): void {
  const parent = readHistory(supportPath).find((entry) => entry.id === parentId);
  if (!parent) return;
  updateHistoryEntry(supportPath, { ...parent, composeState: "failed", composeError: message });
  if (!parent.manifestPath) return;
  const manifest = readJson<CaptureProjectManifest | null>(parent.manifestPath, null);
  if (manifest) writeJson(parent.manifestPath, { ...manifest, composeState: "failed", composeError: message });
}

export function recordFailure(supportPath: string, state: TaskState, message: string, notify = true): void {
  transaction(supportPath, () => {
    const file = activeTaskFile(supportPath, state.task.id);
    const latest = readJson<TaskState | null>(file, null);
    if (latest?.failureRecorded) return;
    const task = state.task;
    const dir = path.join(statePaths(supportPath).projectsDir, task.id);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeJson(path.join(dir, "retry.json"), task);
    // History is keyed by task ID: recovery cannot add a second failure.
    appendHistory(supportPath, {
      captureRequestId: task.type === "screenshot" ? task.captureRequestId || task.id : task.id,
      id: task.id,
      type: task.type,
      status: "failed",
      errorMessage: message,
      movieName: task.probe.movieName,
      source: task.probe.source,
      taskKind: task.type,
      failureLabel: failureLabel(task),
      timestampLabel: failureLabel(task),
      createdAt: new Date().toISOString(),
    });
    if (task.type === "compose") markComposeFailed(supportPath, task.parentId, message);
    if (fs.existsSync(file)) writeJson(file, { ...state, failureRecorded: true, stage: message });
    if (notify && task.type === "screenshot") {
      const count = readHistory(supportPath).filter(
        (item) => item.type === "screenshot" && item.status === "failed",
      ).length;
      postMacNotification(
        "FrameCraft · Capture failed",
        `"${task.probe.movieName}" · ${count} failed · ${readQueue(supportPath).length} still queued`,
      );
    }
  });
}

async function runTask(supportPath: string, state: TaskState): Promise<void> {
  const task = state.task;
  const jobFile = activeTaskFile(supportPath, task.id);
  const cancelFile = path.join(supportPath, `cancel-${task.id}.json`);
  const stoppingFile = path.join(supportPath, `stopping-${task.id}.json`);
  let stopping = false;
  let lastStage = "Starting";
  const update = (stage: string) =>
    transaction(supportPath, () => {
      state = { ...state, stage };
      writeJson(jobFile, state);
    });
  const checkCancellation = () => {
    if (stopping) return true;
    try {
      fs.renameSync(cancelFile, stoppingFile);
    } catch {
      return false;
    }
    stopping = true;
    update("Stopping current task…");
    return true;
  };
  const reportStage = (stage: string) => {
    if (checkCancellation()) throw new Error("Task stopped manually");
    lastStage = stage;
    update(stage);
  };
  try {
    await runWithCancellation(checkCancellation, async () => {
      update("Starting task…");
      const entry: HistoryEntry =
        task.type === "screenshot"
          ? await executeScreenshotTask(task, reportStage)
          : task.type === "clip"
            ? await executeClipTask(task, reportStage)
            : await executeComposeTask(task, reportStage);
      if (checkCancellation()) throw new Error("Task stopped manually");
      transaction(supportPath, () => {
        entry.captureRequestId =
          task.type === "clip" ? task.id : task.type === "compose" ? task.parentId : task.captureRequestId || task.id;
        if (task.type === "compose") updateHistoryEntry(supportPath, entry);
        else appendHistory(supportPath, entry);
        // Subtitles are a follow-up task: the clean frame is already delivered.
        if (task.type === "screenshot" && entry.composeState === "pending") {
          const queue = readQueue(supportPath);
          queue.push({
            id: randomUUID(),
            type: "compose",
            createdAt: Date.now(),
            probe: task.probe,
            flags: task.flags,
            config: task.config,
            parentId: task.id,
          });
          saveQueue(supportPath, queue);
        }
        state = { ...state, phase: "finished", stage: "Completed" };
        writeJson(jobFile, state);
      });
      const image = entry.subbedPngPath || entry.cleanPngPath;
      if (task.type === "screenshot" && task.config.copyToClipboard && image) {
        // Clipboard failure must not turn a saved capture into a failure.
        await copyPngToClipboard(supportPath, image).catch(() => undefined);
      }
    });
  } catch (error) {
    const { describeTaskError } = await import("./task-errors");
    recordFailure(supportPath, state, `Failed at: ${lastStage}\n${describeTaskError(error, task)}`, !stopping);
  } finally {
    transaction(supportPath, () => {
      fs.rmSync(cancelFile, { force: true });
      fs.rmSync(stoppingFile, { force: true });
      const latest = readJson<TaskState | null>(jobFile, null);
      if (latest?.owner === OWNER_ID) fs.rmSync(jobFile, { force: true });
    });
  }
}

/**
 * Process the shared queue inside this command. Every command that adds work
 * calls this and stays until the queue is drained, so tasks belonging to a
 * command Raycast unloads (for example when the same command is launched again)
 * are picked up by whichever command is still running.
 */
export async function runQueue(supportPath: string): Promise<void> {
  startHeartbeat(supportPath);
  pruneOwners(supportPath);
  const running = new Map<string, Promise<void>>();
  const activeDir = path.join(supportPath, "active-tasks");
  for (;;) {
    const { start, idle } = transaction(supportPath, () => {
      fs.mkdirSync(activeDir, { recursive: true, mode: 0o700 });
      let queue = readQueue(supportPath);
      const live: TaskState[] = [];
      const recovered: QueueTask[] = [];
      for (const name of fs.readdirSync(activeDir).filter((n) => n.endsWith(".json"))) {
        const file = path.join(activeDir, name);
        const state = readJson<TaskState | null>(file, null);
        if (!state) continue;
        if (running.has(state.task.id) || ownerAlive(supportPath, state.owner)) {
          live.push(state);
          continue;
        }
        fs.rmSync(file, { force: true });
        if (state.phase === "finished" || state.failureRecorded) continue;
        if (readHistory(supportPath).some((entry) => entry.id === state.task.id && entry.status !== "failed")) continue;
        const attempts = (state.attempts ?? 1) + 1;
        // A stop requested before the command was unloaded still applies; never restart that work.
        const stopRequested = ["cancel", "stopping"].some((prefix) =>
          fs.existsSync(path.join(supportPath, `${prefix}-${state.task.id}.json`)),
        );
        if (stopRequested) {
          recordFailure(supportPath, state, "Task stopped manually", false);
        } else if (attempts > MAX_ATTEMPTS) {
          recordFailure(supportPath, state, "The task was interrupted repeatedly. Try again.");
        } else {
          recovered.push({ ...state.task, attempts } as QueueTask & { attempts: number });
        }
        fs.rmSync(path.join(supportPath, `cancel-${state.task.id}.json`), { force: true });
        fs.rmSync(path.join(supportPath, `stopping-${state.task.id}.json`), { force: true });
      }
      // Interrupted tasks go back to the front so they finish first.
      queue = [...recovered, ...queue.filter((task) => !recovered.some((r) => r.id === task.id))];
      const start: TaskState[] = [];
      for (;;) {
        const count = (type: QueueTask["type"]) =>
          [...live, ...start].filter((state) => state.task.type === type).length;
        const index = queue.findIndex((task) => count(task.type) < LIMITS[task.type]);
        if (index < 0) break;
        const [task] = queue.splice(index, 1);
        const attempts = (task as QueueTask & { attempts?: number }).attempts ?? 1;
        delete (task as QueueTask & { attempts?: number }).attempts;
        const state: TaskState = {
          owner: OWNER_ID,
          startedAt: Date.now(),
          stage: "Starting task…",
          task,
          phase: "running",
          attempts,
        };
        writeJson(activeTaskFile(supportPath, task.id), state);
        start.push(state);
      }
      saveQueue(supportPath, queue);
      return { start, idle: live.length === 0 && start.length === 0 && queue.length === 0 };
    });
    for (const state of start) {
      running.set(
        state.task.id,
        runTask(supportPath, state).finally(() => running.delete(state.task.id)),
      );
    }
    if (idle && running.size === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await clearTemporaryStorage(supportPath, true).catch(() => undefined);
}
