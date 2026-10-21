import { environment, LocalStorage } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseCaffeinateTimeout } from "./duration";

export type CaffeinationReason =
  | { kind: "while"; appName: string }
  | { kind: "for"; endsAt: string }
  | { kind: "until"; until: string }
  | { kind: "schedule"; day: string; from: string; to: string };

export interface CaffeinationState {
  sessionId: string | null;
  isRunning: boolean;
  isManaged: boolean;
  // Windows only observes Coffee's worker; it cannot report an external count.
  externalCount: number | null;
  totalSeconds: number | null;
  startTime: number | null;
  reason?: CaffeinationReason;
}

export interface ConditionalStopResult {
  stopped: boolean;
  state: CaffeinationState;
}

interface ProcessIdentity {
  pid: number;
  uid: number;
  createdAt: string;
  executable: string;
}

interface ManagedSession extends ProcessIdentity {
  version: 1;
  startedAt: number;
  durationSeconds: number | null;
  reason?: CaffeinationReason;
}

const SESSION_KEY = "caffeinationSession";
const EXECUTABLE = "/usr/bin/caffeinate";
const PROCESS_QUERY_TIMEOUT_MS = 5000;
const LOCK_WAIT_MS = 5000;
const LOCK_RETRY_MS = 50;
const STOP_POLL_ATTEMPTS = 40;
const STOP_POLL_INTERVAL_MS = 25;

export function parseReason(value: unknown): CaffeinationReason | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const reason = value as Record<string, unknown>;
  if (reason.kind === "while" && typeof reason.appName === "string") {
    return { kind: "while", appName: reason.appName };
  }
  if (reason.kind === "for" && typeof reason.endsAt === "string" && Number.isFinite(Date.parse(reason.endsAt))) {
    return { kind: "for", endsAt: reason.endsAt };
  }
  if (reason.kind === "until" && typeof reason.until === "string" && Number.isFinite(Date.parse(reason.until))) {
    return { kind: "until", until: reason.until };
  }
  if (
    reason.kind === "schedule" &&
    typeof reason.day === "string" &&
    typeof reason.from === "string" &&
    typeof reason.to === "string"
  )
    return { kind: "schedule", day: reason.day, from: reason.from, to: reason.to };
  return undefined;
}

async function listProcesses(pid?: number): Promise<ProcessIdentity[]> {
  const args = pid === undefined ? ["-axww"] : ["-ww", "-p", String(pid)];
  const output = await new Promise<string>((resolve, reject) => {
    execFile(
      "/bin/ps",
      [...args, "-o", "pid=,uid=,lstart=,comm="],
      {
        encoding: "utf8",
        env: { ...process.env, LC_ALL: "C", TZ: "UTC" },
        timeout: PROCESS_QUERY_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        // macOS ps exits 1 without output when the selected PID no longer exists.
        // Permission errors, timeouts and malformed output must not erase ownership.
        if (error && !(pid !== undefined && error.code === 1 && !stdout.trim() && !stderr.trim())) {
          reject(error);
        } else {
          resolve(stdout);
        }
      },
    );
  });
  if (!output.trim() && pid !== undefined) return [];
  const processes: ProcessIdentity[] = [];
  for (const line of output.trim().split("\n")) {
    const match = /^\s*(\d+)\s+(-?\d+)\s+(\w+\s+\w+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+?)\s*$/.exec(line);
    if (!match) throw new Error("Cannot read the macOS process table");
    processes.push({
      pid: Number(match[1]),
      uid: Number(match[2]),
      createdAt: match[3].replace(/\s+/g, " "),
      executable: match[4],
    });
  }
  return processes;
}

async function getProcessIdentity(pid: number): Promise<ProcessIdentity | undefined> {
  const processes = await listProcesses(pid);
  if (processes.some((entry) => entry.pid !== pid)) throw new Error("Unexpected process in macOS PID inspection");
  return processes[0];
}

function sessionId(session: ManagedSession): string {
  return JSON.stringify([session.pid, session.uid, session.createdAt, session.executable, session.startedAt]);
}

function sameProcess(left: ProcessIdentity, right?: ProcessIdentity): boolean {
  return Boolean(
    right &&
    left.pid === right.pid &&
    left.uid === right.uid &&
    left.createdAt === right.createdAt &&
    left.executable === right.executable,
  );
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

// Commands run in separate Raycast processes. Keep replacement and storage
// updates together so concurrent starts cannot leave an untracked Coffee child.
async function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const path = join(environment.supportPath, "caffeination.lock");
  const identity = await getProcessIdentity(process.pid);
  if (!identity) throw new Error("Cannot identify the Coffee command process");
  const token = randomUUID();
  const prepared = join(environment.supportPath, `caffeination-${token}.lock`);
  const ownerFile = `owner-${token}.json`;
  let acquired = false;
  await mkdir(prepared, { mode: 0o700 });
  try {
    await writeFile(join(prepared, ownerFile), JSON.stringify(identity), { mode: 0o600 });
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (!acquired) {
      if (Date.now() >= deadline) throw new Error("Another Coffee command is still updating caffeination; try again");
      try {
        // Publish a populated directory atomically. rename cannot replace an
        // existing populated lock, so no contender sees a half-written owner.
        await rename(prepared, path);
        acquired = true;
      } catch (error) {
        if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
        try {
          const files = await readdir(path);
          if (files.length === 0) {
            await rmdir(path);
            continue;
          }
          if (files.length !== 1 || !/^owner-[\w-]+\.json$/.test(files[0])) {
            throw new Error("Cannot identify the owner of Coffee's session lock");
          }
          const previous = JSON.parse(await readFile(join(path, files[0]), "utf8")) as ProcessIdentity;
          if (!previous || !Number.isSafeInteger(previous.pid) || previous.pid <= 0) {
            throw new Error("Cannot identify the owner of Coffee's session lock");
          }
          if (!sameProcess(previous, await getProcessIdentity(previous.pid))) {
            // Remove only the old owner's unique file. If someone has acquired
            // a new lock in the meantime, its different owner file protects it
            // from rmdir, which refuses to delete a populated directory.
            await unlink(join(path, files[0]));
            await rmdir(path);
            continue;
          }
        } catch (error) {
          if (!isMissing(error) && (error as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw error;
          continue;
        }
        await delay(LOCK_RETRY_MS);
      }
    }
    return await operation();
  } finally {
    if (acquired) {
      await unlink(join(path, ownerFile)).catch((error) => {
        if (!isMissing(error)) throw error;
      });
      await rmdir(path).catch((error) => {
        if (!isMissing(error) && (error as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw error;
      });
    } else {
      await rm(prepared, { recursive: true, force: true });
    }
  }
}

async function readSession(processes?: ProcessIdentity[]): Promise<ManagedSession | undefined> {
  const raw = await LocalStorage.getItem<string>(SESSION_KEY);
  if (!raw) return undefined;
  let session: ManagedSession | undefined;
  try {
    const value = JSON.parse(raw) as ManagedSession;
    if (
      value.version === 1 &&
      Number.isSafeInteger(value.pid) &&
      value.pid > 0 &&
      value.uid === process.getuid?.() &&
      value.executable === EXECUTABLE &&
      typeof value.createdAt === "string" &&
      Number.isFinite(value.startedAt) &&
      (value.durationSeconds === null || (Number.isSafeInteger(value.durationSeconds) && value.durationSeconds > 0))
    )
      session = { ...value, reason: parseReason(value.reason) };
  } catch {
    /* Older or malformed records cannot establish ownership. */
  }
  // Keep inspection outside the JSON-validation catch: unavailable inspection
  // is an error, not evidence that a saved session has ended.
  if (session) {
    const sessionPid = session.pid;
    const identity = processes ? processes.find(({ pid }) => pid === sessionPid) : await getProcessIdentity(sessionPid);
    if (!sameProcess(session, identity)) session = undefined;
  }
  if (!session) await LocalStorage.removeItem(SESSION_KEY);
  return session;
}

async function readState(): Promise<CaffeinationState> {
  const processes = await listProcesses();
  const session = await readSession(processes);
  const externalCount = processes.filter(
    ({ executable, pid }) => (executable === EXECUTABLE || executable === "caffeinate") && pid !== session?.pid,
  ).length;
  return {
    sessionId: session ? sessionId(session) : null,
    isRunning: Boolean(session) || externalCount > 0,
    isManaged: Boolean(session),
    externalCount,
    totalSeconds: session?.durationSeconds ?? null,
    startTime: session?.startedAt ?? null,
    reason: session?.reason,
  };
}

async function stopSession(expectedSessionId?: string): Promise<boolean> {
  const session = await readSession();
  if (!session) return false;
  if (
    expectedSessionId !== undefined &&
    (sessionId(session) !== expectedSessionId || session.reason?.kind !== "schedule")
  ) {
    return false;
  }
  let stopped = false;
  // Recheck immediately before signalling; neither a cached PID nor a matching
  // process name is sufficient to stop someone else's inhibitor.
  if (sameProcess(session, await getProcessIdentity(session.pid))) {
    try {
      process.kill(session.pid, "SIGTERM");
      stopped = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
    for (let attempt = 0; attempt < STOP_POLL_ATTEMPTS; attempt++) {
      if (!sameProcess(session, await getProcessIdentity(session.pid))) break;
      if (attempt === STOP_POLL_ATTEMPTS - 1) throw new Error("Coffee's caffeinate process did not stop");
      await delay(STOP_POLL_INTERVAL_MS);
    }
  }
  await LocalStorage.removeItem(SESSION_KEY);
  return stopped;
}

export function getMacCaffeinationState(): Promise<CaffeinationState> {
  return withSessionLock(readState);
}

export function stopMacCaffeinate(): Promise<CaffeinationState> {
  return withSessionLock(async () => {
    await stopSession();
    return readState();
  });
}

export function stopMacCaffeinateIfMatches(expectedSessionId: string): Promise<ConditionalStopResult> {
  return withSessionLock(async () => {
    const stopped = await stopSession(expectedSessionId);
    return { stopped, state: await readState() };
  });
}

export async function startMacCaffeinate(args: string[], reason?: CaffeinationReason): Promise<CaffeinationState> {
  const durationSeconds = parseCaffeinateTimeout(args);
  return withSessionLock(async () => {
    await stopSession();
    const startedAt = Date.now();
    const child = spawn(EXECUTABLE, args, { detached: true, stdio: "ignore" });
    await new Promise<void>((resolve, reject) => {
      child.once("error", reject);
      child.once("spawn", resolve);
    });
    try {
      const identity = child.pid === undefined ? undefined : await getProcessIdentity(child.pid);
      if (!identity || identity.executable !== EXECUTABLE || identity.uid !== process.getuid?.()) {
        throw new Error("Cannot identify Coffee's caffeinate process");
      }
      const session: ManagedSession = {
        ...identity,
        version: 1,
        startedAt,
        durationSeconds,
        reason,
      };
      await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
      child.unref();
      return await readState();
    } catch (error) {
      // This child is still attached to this command and has not been reaped;
      // roll it back if we cannot persist a verifiable ownership record.
      child.kill("SIGTERM");
      await LocalStorage.removeItem(SESSION_KEY);
      throw error;
    }
  });
}
