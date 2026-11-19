import fs from "node:fs";
import os from "node:os";
import { clearTemporaryStorage } from "../lib/storage-maintenance";
import path from "node:path";
import { spawn } from "node:child_process";
import { statePaths } from "../lib/env";
import { readQueue, saveQueue, readHistory } from "../lib/queue";
import { alive, taskGroupAlive, readJson, transaction, writeJson } from "./state-store";
import { activeTaskFile, recordFailure, runTaskProcess, TaskState } from "./task-process";
import { runStudioExport, StudioExportOptions } from "../lib/studio-export";

/** Screenshot work is I/O bound and shares one prepared fragment per source;
 * subtitle composition is CPU/IO heavy but independent of capture; clip work
 * re-encodes and stays serial. Slots are separate so a slow subtitle render
 * never holds back the next frame capture. */
const SCREENSHOT_CONCURRENCY = Math.max(3, Math.min(8, Math.floor((os.cpus().length || 4) * 0.75)));
const COMPOSE_CONCURRENCY = Math.max(2, Math.min(4, Math.floor((os.cpus().length || 4) / 2)));
const CLIP_CONCURRENCY = 1;

function lockPid(file: string): number {
  try {
    return Number.parseInt(fs.readFileSync(file, "utf8"), 10);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

/** All new dispatcher ownership changes use the same transaction as enqueue.
 * worker.lock stays a plain PID for old UI/worker compatibility. */
function writeOwner(file: string): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, String(process.pid), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

async function runDispatcher(supportPath: string): Promise<void> {
  supportPath = path.resolve(supportPath);
  const { lockFile, activeFile } = statePaths(supportPath);
  const activeDir = path.join(supportPath, "active-tasks");
  let ownsLock = false;
  try {
    for (;;) {
      const outcome = transaction(supportPath, () => {
        const owner = lockPid(lockFile);
        // Wait for a legacy worker rather than killing it or racing its queue writes.
        // A redundant new dispatcher also waits: this covers a winner exiting just
        // before an enqueue's spawn arrives, and takeover after dispatcher crashes.
        if (owner !== process.pid && alive(owner)) return "wait";
        const liveLegacy = readJson<TaskState | null>(activeFile, null);
        if (liveLegacy && alive(liveLegacy.pid)) return "wait";
        if (owner !== process.pid) {
          writeOwner(lockFile);
          ownsLock = true;
        }
        fs.mkdirSync(activeDir, { recursive: true, mode: 0o700 });
        const queue = readQueue(supportPath);
        const states: TaskState[] = [];
        for (const name of fs.readdirSync(activeDir).filter((name) => name.endsWith(".json"))) {
          const file = path.join(activeDir, name);
          const state = readJson<TaskState | null>(file, null);
          if (!state) continue;
          if (state.phase === "reserved") {
            // A reservation is written BEFORE dequeue; remove its duplicate from
            // the queue on recovery, then launch it exactly once below.
            states.push(state);
          } else if (taskGroupAlive(state.pid)) {
            states.push(state);
          } else {
            const result = readHistory(supportPath).find((entry) => entry.id === state.task.id);
            if (!result && state.phase !== "finished")
              recordFailure(
                supportPath,
                state,
                "The background task process exited unexpectedly. The task was kept so you can retry it.",
                !fs.existsSync(path.join(supportPath, `stopping-${state.task.id}.json`)),
              );
            fs.rmSync(file, { force: true });
            fs.rmSync(path.join(supportPath, `cancel-${state.task.id}.json`), { force: true });
            fs.rmSync(path.join(supportPath, `stopping-${state.task.id}.json`), { force: true });
          }
        }
        // Recover a dead legacy worker, without ever signalling a legacy PID.
        const legacy = readJson<TaskState | null>(activeFile, null);
        if (legacy && !alive(legacy.pid)) {
          if (!readHistory(supportPath).some((entry) => entry.id === legacy.task.id)) {
            recordFailure(supportPath, legacy, "A previous background task process exited. Try again.");
            fs.rmSync(activeTaskFile(supportPath, legacy.task.id), { force: true });
          }
          fs.rmSync(activeFile, { force: true });
        }
        const reservedIds = new Set(states.map((state) => state.task.id));
        let pending = queue.filter((task) => !reservedIds.has(task.id));
        // Each task class has its own ceiling: several captures in flight, a few
        // subtitle renders, and exactly one clip encoder at a time.
        while (states.length < SCREENSHOT_CONCURRENCY + COMPOSE_CONCURRENCY + CLIP_CONCURRENCY) {
          const shots = states.filter((state) => state.task.type === "screenshot").length;
          const composes = states.filter((state) => state.task.type === "compose").length;
          const hasClip = states.some((state) => state.task.type === "clip");
          const index = pending.findIndex((task) =>
            task.type === "screenshot"
              ? shots < SCREENSHOT_CONCURRENCY
              : task.type === "compose"
                ? composes < COMPOSE_CONCURRENCY
                : !hasClip,
          );
          if (index < 0) break;
          const task = pending[index];
          const state: TaskState = {
            pid: process.pid,
            startedAt: Date.now(),
            stage: "Waiting to start task process…",
            task,
            phase: "reserved",
          };
          writeJson(activeTaskFile(supportPath, task.id), state);
          states.push(state);
          pending = pending.filter((item) => item.id !== task.id);
        }
        saveQueue(supportPath, pending);
        for (const state of states.filter((state) => state.phase === "reserved")) {
          const file = activeTaskFile(supportPath, state.task.id);
          // The child cannot read its job until this transaction releases, so PID
          // publication always precedes executing media work (including recovery).
          const child = spawn(process.execPath, [process.argv[1], "--task", file, supportPath], {
            detached: true,
            stdio: "ignore",
          });
          child.once("error", () => {
            /* next reconciliation persists failure */
          });
          if (!child.pid) {
            recordFailure(supportPath, state, "Couldn't start the task subprocess. Try again.");
            fs.rmSync(file, { force: true });
            continue;
          }
          state.pid = child.pid;
          state.phase = "running";
          writeJson(file, state);
          child.unref();
        }
        if (states.length === 0 && pending.length === 0) {
          // Enqueues use this same lock. Their subsequent spawn either observes
          // this dispatcher still running, or acquires the released ownership.
          if (lockPid(lockFile) === process.pid) fs.rmSync(lockFile, { force: true });
          ownsLock = false;
          return "done";
        }
        return "wait";
      });
      if (outcome === "done") {
        try {
          await clearTemporaryStorage(supportPath, true);
        } catch {
          /* Cleanup cannot lose task results. */
        }
        const child = spawn(process.execPath, [process.argv[1], "--cleanup", supportPath], {
          detached: true,
          stdio: "ignore",
        });
        child.on("error", () => undefined);
        child.unref();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } finally {
    if (ownsLock)
      transaction(supportPath, () => {
        if (lockPid(lockFile) === process.pid) fs.rmSync(lockFile, { force: true });
      });
  }
}

const args = process.argv.slice(2);
async function delayedCleanup(supportPath: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000 + 1000));
  await clearTemporaryStorage(supportPath, true);
}
const work =
  args[0] === "--cleanup" && args[1]
    ? delayedCleanup(path.resolve(args[1]))
    : args[0] === "--export" && args[1] && args[2]
      ? runStudioExport(path.resolve(args[1]), JSON.parse(args[2]) as StudioExportOptions)
      : args[0] === "--task" && args[1] && args[2]
        ? runTaskProcess(path.resolve(args[1]), path.resolve(args[2]))
        : args[0]
          ? runDispatcher(args[0])
          : Promise.resolve();
work.catch(() => {
  process.exitCode = 1;
});
