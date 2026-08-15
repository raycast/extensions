import { spawn as defaultSpawn } from "node:child_process";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import type { KeshaSpawn } from "./kesha-bin";
import {
  TRANSCRIBE_TIMEOUT_MS,
  TRANSCRIBE_TIMEOUT_SECONDS,
} from "./dictation-config";
import type { RunningTask } from "./dictation-types";

type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

export interface ProcessTaskDeps {
  spawn?: SpawnFn;
  kill?: (proc: ChildProcess, signal: NodeJS.Signals) => void;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
}

export function capTail(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(-maxLength) : value;
}

export function killProcessGroup(proc: ChildProcess, signal: NodeJS.Signals) {
  if (proc.pid) {
    try {
      process.kill(-proc.pid, signal);
      return;
    } catch {
      // Fall back to killing the wrapper if the process group is unavailable.
    }
  }
  proc.kill(signal);
}

export function stopProcessWithWatchdog(
  proc: ChildProcess | null,
  deps: ProcessTaskDeps = {},
) {
  if (!proc) return;
  const kill = deps.kill ?? killProcessGroup;
  const schedule = deps.setTimeout ?? setTimeout;
  if (proc.stdin && !proc.stdin.destroyed) {
    try {
      proc.stdin.end("\n");
    } catch {
      // Fall through to the watchdog below.
    }
  }

  schedule(() => {
    if (proc.exitCode == null) kill(proc, "SIGTERM");
  }, 1500).unref?.();

  schedule(() => {
    if (proc.exitCode == null) kill(proc, "SIGKILL");
  }, 5000).unref?.();
}

export function terminateProcessWithWatchdog(
  proc: ChildProcess | null,
  deps: ProcessTaskDeps = {},
) {
  if (!proc) return;
  const kill = deps.kill ?? killProcessGroup;
  const schedule = deps.setTimeout ?? setTimeout;
  if (proc.exitCode == null) kill(proc, "SIGTERM");
  schedule(() => {
    if (proc.exitCode == null) kill(proc, "SIGKILL");
  }, 3000).unref?.();
}

export function startKeshaRecorder(
  kesha: KeshaSpawn,
  audioPath: string,
  maxSeconds: number,
  deps: ProcessTaskDeps = {},
): RunningTask<void> {
  const spawn = deps.spawn ?? defaultSpawn;
  const proc = spawn(
    kesha.command,
    [
      ...kesha.prefixArgs,
      "record",
      "--out",
      audioPath,
      "--max-seconds",
      String(maxSeconds),
    ],
    { stdio: ["pipe", "ignore", "pipe"], detached: true },
  );
  let stderr = "";
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr = capTail(stderr + chunk.toString("utf8"), 8000);
  });

  return {
    stop: () => stopProcessWithWatchdog(proc, deps),
    done: waitForExit(proc).then((exitCode) => {
      if (exitCode !== 0) {
        throw new Error(
          stderr.trim() || `kesha record exited with code ${exitCode}`,
        );
      }
    }),
  };
}

export function startKeshaTranscriber(
  kesha: KeshaSpawn,
  audioPath: string,
  deps: ProcessTaskDeps = {},
): RunningTask<string> {
  const spawn = deps.spawn ?? defaultSpawn;
  const kill = deps.kill ?? killProcessGroup;
  const schedule = deps.setTimeout ?? setTimeout;
  const unschedule = deps.clearTimeout ?? clearTimeout;
  const proc = spawn(kesha.command, [...kesha.prefixArgs, audioPath], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  proc.stdout?.on("data", (chunk: Buffer) => {
    stdout = capTail(stdout + chunk.toString("utf8"), 16 * 1024 * 1024);
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr = capTail(stderr + chunk.toString("utf8"), 8000);
  });

  const timeout = schedule(() => {
    timedOut = true;
    kill(proc, "SIGTERM");
  }, TRANSCRIBE_TIMEOUT_MS);
  timeout.unref?.();

  const forceKill = schedule(() => {
    if (proc.exitCode == null) kill(proc, "SIGKILL");
  }, TRANSCRIBE_TIMEOUT_MS + 3000);
  forceKill.unref?.();

  return {
    stop: () => terminateProcessWithWatchdog(proc, deps),
    done: waitForExit(proc)
      .then((exitCode) => {
        if (timedOut) {
          throw new Error(
            `kesha transcription timed out after ${TRANSCRIBE_TIMEOUT_SECONDS} seconds.`,
          );
        }
        if (exitCode !== 0) {
          throw new Error(
            stderr.trim() || `kesha exited with code ${exitCode}`,
          );
        }
        return stdout;
      })
      .finally(() => {
        unschedule(timeout);
        unschedule(forceKill);
      }),
  };
}

function waitForExit(proc: ChildProcess): Promise<number | null> {
  return new Promise<number | null>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("exit", (code) => resolve(code));
  });
}
