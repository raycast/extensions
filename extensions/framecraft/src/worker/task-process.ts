import fs from "node:fs";
import { DiscPlaylistCandidatesError } from "../lib/disc-source";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { setCancellationCheck } from "../lib/command-runner";
import { statePaths } from "../lib/env";
import { describeTaskError } from "../lib/task-errors";
import { copyPngToClipboard, postMacNotification } from "../lib/macos-native";
import { executeClipTask, executeComposeTask, executeScreenshotTask } from "../lib/media-engine";
import {
  appendHistory,
  readHistory,
  readQueue,
  enqueueTask,
  deleteHistoryEntry,
  updateHistoryEntry,
} from "../lib/queue";
import { ActiveWorkerState, HistoryEntry, QueueTask } from "../lib/types";
import { readJson, transaction, writeJson } from "./state-store";

export interface TaskState extends ActiveWorkerState {
  phase?: "reserved" | "running" | "finished";
  failureRecorded?: boolean;
  failureNotified?: boolean;
}

export function activeTaskFile(supportPath: string, id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid task ID");
  return path.join(supportPath, "active-tasks", `${id}.json`);
}

/** Human-readable label so a failure row answers "what kind of task, where".
 * The old record stored only a raw second count, which told the user nothing. */
function failureLabel(task: QueueTask): string {
  const hms = (sec: number) => {
    const safe = Math.max(0, sec);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  if (task.type === "clip") {
    return `Clip ${hms(task.startSec)} → ${hms(task.endSec)} (${task.durationSec.toFixed(1)}s)`;
  }
  if (task.type === "compose") {
    return `Subtitle composite @ ${hms(task.probe.positionSec)}`;
  }
  return `Frame @ ${hms(task.probe.positionSec)}`;
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
    // History is keyed by task ID: crash recovery cannot add a second failure.
    appendHistory(supportPath, {
      captureRequestId: task.type === "screenshot" ? task.captureRequestId || task.id : task.id,
      playlist: task.probe.playlist,
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
    state.failureRecorded = true;
    state.stage = message;
    state.failureNotified = notify && task.type === "screenshot";
    writeJson(file, state);
    if (state.failureNotified) {
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

export async function runTaskProcess(jobFile: string, supportPath: string): Promise<void> {
  let state = transaction(supportPath, () => {
    const job = readJson<TaskState | null>(jobFile, null);
    if (!job || jobFile !== activeTaskFile(supportPath, job.task.id)) return null;
    // If the dispatcher died between spawn and PID publication, exactly one
    // child can claim the durable reservation. Competing recovery children exit.
    if (job.phase === "reserved") {
      job.pid = process.pid;
      job.phase = "running";
      writeJson(jobFile, job);
    }
    return job.pid === process.pid ? job : null;
  });
  if (!state) return;
  const currentTask: QueueTask = state.task;
  const cancelFile = path.join(supportPath, `cancel-${currentTask.id}.json`);
  const stoppingFile = path.join(supportPath, `stopping-${currentTask.id}.json`);
  let stopping = false;
  let lastStage = "Starting";
  const update = (stage: string) =>
    transaction(supportPath, () => {
      state = { ...state!, phase: "running", stage };
      writeJson(jobFile, state);
    });
  update("Starting task...");
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
  setCancellationCheck(checkCancellation);
  const reportStage = (stage: string) => {
    if (checkCancellation()) throw new Error("Task stopped manually");
    lastStage = stage;
    update(stage);
  };
  try {
    const entry: HistoryEntry =
      currentTask.type === "screenshot"
        ? await executeScreenshotTask(currentTask, reportStage)
        : currentTask.type === "clip"
          ? await executeClipTask(currentTask, reportStage)
          : await executeComposeTask(currentTask, reportStage);
    if (checkCancellation()) throw new Error("Task stopped manually");
    // Persist the result and terminal marker together under the shared lock.
    transaction(supportPath, () => {
      entry.captureRequestId =
        currentTask.type === "clip"
          ? currentTask.id
          : currentTask.type === "compose"
            ? currentTask.parentId
            : currentTask.captureRequestId || currentTask.id;
      entry.playlist = currentTask.probe.playlist;
      if (currentTask.type === "compose") {
        // Compose refreshes the capture that already exists; never add a second row.
        updateHistoryEntry(supportPath, entry);
      } else {
        appendHistory(supportPath, entry);
      }
      // Subtitles are a follow-up task: the clean frame is already delivered, so
      // queue the compose stage instead of holding this slot for it.
      if (currentTask.type === "screenshot" && entry.composeState === "pending") {
        enqueueTask(supportPath, {
          id: randomUUID(),
          type: "compose",
          createdAt: Date.now(),
          probe: currentTask.probe,
          flags: currentTask.flags,
          config: currentTask.config,
          parentId: currentTask.id,
        });
      }
      state = { ...state!, phase: "finished", stage: "Completed" };
      writeJson(jobFile, state);
    });
    if (
      currentTask.type === "screenshot" &&
      currentTask.config.copyToClipboard &&
      (entry.subbedPngPath || entry.cleanPngPath)
    ) {
      // Clipboard failure must not turn an already persisted capture into a failure.
      try {
        await copyPngToClipboard(supportPath, (entry.subbedPngPath || entry.cleanPngPath)!);
      } catch {
        /* capture is saved */
      }
    }
  } catch (error) {
    const candidateFile = path.join(statePaths(supportPath).projectsDir, currentTask.id, "playlists.json");
    if (
      !stopping &&
      error instanceof DiscPlaylistCandidatesError &&
      currentTask.type === "screenshot" &&
      currentTask.probe.playlist === undefined &&
      fs.existsSync(candidateFile)
    ) {
      const rawCandidates = readJson<
        Array<{
          playlist: number;
          durationSec?: number;
          segments?: Array<{ clipId: string; inTime: number; outTime: number; startTime: number }>;
        }>
      >(candidateFile, []);
      const seen = new Set<string>();
      const candidates = rawCandidates.filter((candidate) => {
        const signature = candidate.segments?.length
          ? JSON.stringify([candidate.durationSec, candidate.segments])
          : `playlist:${candidate.playlist}`;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });
      if (candidates.length > 0 && candidates.length <= 3) {
        transaction(supportPath, () => {
          for (const candidate of candidates) {
            const task = structuredClone(currentTask);
            task.id = randomUUID();
            task.captureRequestId = currentTask.captureRequestId || currentTask.id;
            task.probe.playlist = candidate.playlist;
            task.probe.movieName = `${currentTask.probe.movieName} · Version ${candidate.playlist}`;
            enqueueTask(supportPath, task);
          }
          deleteHistoryEntry(supportPath, currentTask.id);
        });
        return;
      }
    }
    recordFailure(supportPath, state!, `Failed at: ${lastStage}\n${describeTaskError(error, currentTask)}`, !stopping);
  } finally {
    setCancellationCheck(undefined);
    transaction(supportPath, () => {
      fs.rmSync(cancelFile, { force: true });
      fs.rmSync(stoppingFile, { force: true });
      fs.rmSync(jobFile, { force: true });
    });
  }
}
