import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@chrismessina/raycast-logger";
import { environment } from "@raycast/api";
import { DEMO_JOB_SECONDS, demoJobOutput, demoScoped, isDemo } from "./demo";
import { cliSpawnOptions, DayOneCliError, findUsableCli, IS_WINDOWS, lastErrorLine } from "./cli";

const log = logger.child("[jobs]");

export type RunRecord = { pid: number; startedAt: number; meta?: Record<string, number> };

/**
 * A CLI command that outlives the Raycast command that started it. It runs detached and writes to files in
 * `supportPath/<name>`, so any command (or a later launch) can see whether it is still going and read its result.
 * The CLI writes its JSON summary to stdout only as it exits, so by default a non-empty stdout means the run is over.
 * A job that runs the CLI several times passes its own `finished` test.
 */
export function detachedJob(
  name: string,
  maxRunMs: number,
  finished: (stdout: string, run: RunRecord) => boolean = (stdout) => Boolean(stdout.trim()),
) {
  const dir = () => join(environment.supportPath, demoScoped(name));
  const files = () => ({
    dir: dir(),
    pid: join(dir(), "run.json"),
    log: join(dir(), "stderr.log"),
    out: join(dir(), "stdout.json"),
  });

  function readRun(): RunRecord | null {
    try {
      return JSON.parse(readFileSync(files().pid, "utf8")) as RunRecord;
    } catch {
      return null;
    }
  }

  function isRunning(): boolean {
    const run = readRun();
    if (!run || Date.now() - run.startedAt > maxRunMs) return false;
    // Checked before the PID, since the operating system may have given that PID to another process by now.
    if (finished(safeRead(files().out), run)) return false;
    try {
      process.kill(run.pid, 0);
    } catch {
      return false;
    }
    return !startedLater(run);
  }

  /** Starts the command, truncating the previous run's files. Callers check `isRunning()` first. */
  async function start(
    args: string[],
    options: { script?: string; meta?: Record<string, number> } = {},
  ): Promise<void> {
    const cli = await findUsableCli();
    if (isDemo()) {
      const output = demoJobOutput(name);
      if (IS_WINDOWS) {
        // No /bin/sh: the run is written as already finished.
        mkdirSync(dir(), { recursive: true });
        writeFileSync(files().log, "");
        writeFileSync(files().out, output);
        writeFileSync(files().pid, JSON.stringify({ pid: process.pid, startedAt: Date.now(), meta: options.meta }));
        return;
      }
      // The fixture output is an argument, never part of the script.
      options = { script: `sleep ${DEMO_JOB_SECONDS}; printf "%s" "$2"`, meta: options.meta };
      args = [output];
    }
    // A script runs under /bin/sh with the CLI's path as $1 and `args` after it; never with user text in it.
    const [command, argv] = options.script
      ? ["/bin/sh", ["-c", options.script, "sh", cli.path, ...args]]
      : [cli.path, args];
    const { pid, log: logFile, out } = files();
    mkdirSync(dir(), { recursive: true });
    const errFd = openSync(logFile, "w");
    const outFd = openSync(out, "w");
    try {
      const child = spawn(command, argv, { detached: true, stdio: ["ignore", outFd, errFd], ...cliSpawnOptions() });
      if (!child.pid) throw new DayOneCliError("Couldn't start the Day One CLI");
      writeFileSync(
        pid,
        JSON.stringify({ pid: child.pid, startedAt: Date.now(), meta: options.meta } satisfies RunRecord),
      );
      child.unref();
      log.debug(`${name} started`, { pid: child.pid });
    } finally {
      closeSync(errFd);
      closeSync(outFd);
    }
  }

  /** The finished run's JSON summary. Throws the CLI's error text when it exited without one. */
  function readOutput<T>(stoppedMessage: string): T {
    const { out, log: logFile } = files();
    try {
      return JSON.parse(readFileSync(out, "utf8")) as T;
    } catch {
      throw new DayOneCliError(lastErrorLine(safeRead(logFile)) || stoppedMessage);
    }
  }

  return {
    files,
    readRun,
    isRunning,
    start,
    readOutput,
    startedAt: () => readRun()?.startedAt ?? null,
    output: () => safeRead(files().out),
  };
}

/**
 * True when the process now holding the run's PID started after the run did, so it isn't the run. A run that failed
 * leaves no summary, and after a restart its PID can belong to any process. macOS only: Windows keeps the PID check.
 */
function startedLater(run: RunRecord): boolean {
  if (IS_WINDOWS) return false;
  try {
    // In UTC: local time has no offset in `ps` output, so it's ambiguous for an hour when daylight saving ends.
    const lstart = execFileSync("/bin/ps", ["-o", "lstart=", "-p", String(run.pid)], {
      encoding: "utf8",
      env: { ...process.env, TZ: "UTC" },
    });
    const started = Date.parse(`${lstart.trim()} UTC`);
    // `ps` reports whole seconds, so allow for the rounding.
    return Number.isFinite(started) && started > run.startedAt + 2000;
  } catch {
    return false;
  }
}

export function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

export function mtime(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}
