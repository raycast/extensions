// Background runs. Each run gets a record folder in the extension's
// support path (0700; files 0600) and a detached `/bin/sh fabric-bg.sh` that
// outlives Raycast. Stop only ever kills a process group whose start time and
// command still match the record, so a reused PID is never hit (ISC-28.1).

import { execFile, execFileSync, spawn } from "node:child_process";
import { chmodSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildArgv, type RunSpec } from "./argv";
import { readText } from "./loaders";
import { parseTokens, type Tokens } from "./metadata";
import { runLabel } from "./output";
import { guardDir, PathError } from "./paths";
import { type GroupSignaller, signalGroup, signalPid } from "./proc";
import { redact } from "./redact";
import type { RunStatus } from "./result";

const run = promisify(execFile);

export interface RunMeta {
  id: string;
  pattern: string;
  inputLabel: string;
  startedAt: string;
  pid?: number;
  lstart?: string;
  finalDir: string;
  finalName: string;
}

export type BgStatus = RunStatus;

export interface RunRecord extends RunMeta {
  status: BgStatus;
  code?: number;
  /** Failed without reporting back: no exit file, and its wrapper is gone (LOST_NOTE). */
  lost: boolean;
  /** What fabric printed, redacted. */
  stderr: string;
  /** Where the answer was saved, once done. */
  output?: string;
  /** fabric's token counts, which the wrapper copies out before redaction. */
  tokens?: Tokens;
}

/** What Show Background Runs calls each status. */
export const STATUS_LABEL: Record<BgStatus, string> = {
  running: "Running",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
};

/** Copy Error Output is offered only for a failed run that printed something: a successful run's stderr holds only fabric's "Output also written to…" note. */
export const canCopyError = (r: RunRecord) => r.status === "failed" && !!r.stderr.trim();

const FILE_NAME = /^[A-Za-z0-9_][A-Za-z0-9_. -]*\.md$/;
const ID = /^[0-9]{8}-[0-9]{6}-[a-z0-9]{6}$/;
const WRAPPER = "fabric-bg.sh";

function newId(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const d = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const t = `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `${d}-${t}-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
}

async function ps(pid: number, field: "lstart" | "command"): Promise<string | undefined> {
  try {
    const { stdout } = await run("/bin/ps", ["-o", `${field}=`, "-p", String(pid)]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function privateDir(dir: string) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
}

export interface StartOptions {
  runsDir: string;
  /** Absolute path to fabric-bg.sh. */
  wrapper: string;
  fabricPath: string;
  spec: RunSpec;
  inputLabel: string;
  outputFolder: string;
  finalName: string;
  patternsRoot: string;
  /** Folders the answer is never saved into, besides patterns (paths.refusedFolders). */
  refused?: readonly string[];
  env?: NodeJS.ProcessEnv;
  now?: Date;
}

export async function startBackground(o: StartOptions): Promise<RunMeta> {
  if (!o.fabricPath.startsWith("/")) throw new Error(`fabric path must be absolute: ${o.fabricPath}`);
  if (!FILE_NAME.test(o.finalName) || o.finalName.includes("..")) throw new PathError(`bad file name: ${o.finalName}`);
  const finalDir = guardDir(o.outputFolder, o.patternsRoot, o.refused);
  privateDir(o.runsDir);
  const now = o.now ?? new Date();
  const id = newId(now);
  const runDir = join(o.runsDir, id);
  mkdirSync(runDir, { mode: 0o700 });

  // Selected text never rides argv: it goes to a 0600 file the wrapper feeds to stdin and then deletes.
  if (o.spec.input.kind === "text")
    writeFileSync(join(runDir, "input.txt"), o.spec.input.text, { mode: 0o600, flag: "wx" });
  // Token counts (which stream the run); the answer file is still complete (probed on fabric 1.4.518).
  const argv = buildArgv({ ...o.spec, showMetadata: true, dryRun: false, output: join(runDir, "answer.md") });
  const pattern = runLabel(o.spec);

  const child = spawn("/bin/sh", [o.wrapper, runDir, finalDir, o.finalName, pattern, o.fabricPath, ...argv], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, ...o.env },
  });
  child.unref();
  const pid = child.pid;
  const meta: RunMeta = {
    id,
    pattern,
    inputLabel: o.inputLabel,
    startedAt: now.toISOString(),
    pid,
    lstart: pid ? await ps(pid, "lstart") : undefined,
    finalDir,
    finalName: o.finalName,
  };
  writeFileSync(join(runDir, "meta.json"), JSON.stringify(meta), { mode: 0o600 });
  return meta;
}

const read = readText;

/**
 * Is the recorded wrapper still the process at that pid? Signal 0 asks whether the pid
 * exists (EPERM: it does, another user's); after a restart pids are reused, so a live pid
 * also has to have the recorded start time, as Stop requires.
 */
function alive(pid: number | undefined, lstart: string | undefined): boolean {
  // A record's pid comes from disk: 0, 1 or garbage is never a wrapper of ours.
  if (!pid || !Number.isInteger(pid) || pid <= 1) return false;
  if (signalPid(pid, 0) === "gone") return false;
  if (!lstart) return true; // start time never recorded: can't tell, so trust the pid
  try {
    return (
      execFileSync("/bin/ps", ["-o", "lstart=", "-p", String(pid)], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() === lstart
    );
  } catch {
    return false;
  }
}

/** The exit the wrapper writes for a stopped run (fabric-bg.sh `finish 143`, 128 + SIGTERM). */
export const STOPPED_CODE = 143;

export const LOST_NOTE = "The run ended without reporting back (force quit, crash or restart). Nothing was saved.";

export function readRun(runsDir: string, id: string): RunRecord | undefined {
  if (!ID.test(id)) return undefined;
  const dir = join(runsDir, id);
  const raw = read(join(dir, "meta.json"));
  if (!raw) return undefined;
  let meta: RunMeta;
  try {
    meta = JSON.parse(raw) as RunMeta;
  } catch {
    return undefined;
  }
  let exit = read(join(dir, "exit"))?.trim();
  // No exit file and no wrapper process: it died without its trap running. Re-read exit
  // after the check, since the wrapper writes it just before exiting.
  const lost =
    exit === undefined && !alive(meta.pid, meta.lstart) && (exit = read(join(dir, "exit"))?.trim()) === undefined;
  const code = exit === undefined ? undefined : Number(exit);
  const status: BgStatus = lost
    ? "failed"
    : code === undefined
      ? "running"
      : code === 0
        ? "done"
        : code === STOPPED_CODE
          ? "stopped"
          : "failed";
  return {
    ...meta,
    status,
    code,
    lost,
    stderr: redact(read(join(dir, "stderr")) ?? ""),
    output: read(join(dir, "output"))?.trim(),
    tokens: parseTokens(read(join(dir, "tokens")) ?? ""),
  };
}

/** Newest first. Finished records older than `maxAgeDays` are deleted; saved answers never are (ISC-28). */
export function listRuns(runsDir: string, now = new Date(), maxAgeDays = 7): RunRecord[] {
  let ids: string[];
  try {
    ids = readdirSync(runsDir).filter((d) => ID.test(d));
  } catch {
    return [];
  }
  const cutoff = now.getTime() - maxAgeDays * 86_400_000;
  const out: RunRecord[] = [];
  for (const id of ids) {
    const r = readRun(runsDir, id);
    // A lost run's selected text is deleted now; its trap never got to (ISC-26.2).
    if (r?.lost) rmSync(join(runsDir, id, "input.txt"), { force: true });
    if (r && r.status !== "running" && Date.parse(r.startedAt) < cutoff) {
      rmSync(join(runsDir, id), { recursive: true, force: true });
      continue;
    }
    if (r) out.push(r);
  }
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * "stopping": signalled, but fabric's group was not gone within `waitMs`; the record turns Stopped once it is.
 * "lost": nothing to signal; the wrapper died without reporting (RunRecord.lost).
 */
export type StopOutcome = "stopped" | "stopping" | "finished" | "lost" | "refused";

export async function stopRun(
  runsDir: string,
  id: string,
  waitMs = 5000,
  /** Test seam: the race where the wrapper exits between the checks and the signal. */
  signal: GroupSignaller = signalGroup,
): Promise<StopOutcome> {
  const r = readRun(runsDir, id);
  if (!r) return "refused";
  const exitFile = join(runsDir, id, "exit");
  // Whatever the list shows as over Stop calls over too, so the two never disagree about one run.
  // A lost run isn't called finished: its wrapper died unreported, and fabric may still be running.
  if (r.lost) return "lost";
  if (r.status !== "running") return "finished";
  if (!r.pid || !r.lstart) return "refused";
  if ((await ps(r.pid, "lstart")) !== r.lstart) return "refused";
  if (!(await ps(r.pid, "command"))?.includes(WRAPPER)) return "refused";
  const exited = () => {
    const exit = read(exitFile)?.trim();
    return exit === undefined ? undefined : Number(exit) === STOPPED_CODE ? "stopped" : "finished";
  };
  const sent = signal(r.pid, "SIGTERM");
  // Gone: it ended between the checks above and the signal; the wrapper writes exit just before exiting.
  if (sent === "gone") return exited() ?? "refused";
  if (sent !== "sent") return "refused";
  // The wrapper writes exit only once fabric's whole group is gone (SIGKILL after its grace).
  const until = Date.now() + waitMs;
  for (;;) {
    const outcome = exited();
    if (outcome) return outcome;
    if (Date.now() >= until) return "stopping";
    await new Promise((res) => setTimeout(res, 50));
  }
}
