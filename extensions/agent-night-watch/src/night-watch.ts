import { environment } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { promisify } from "node:util";
import {
  NightWatchStatus,
  SessionPhase,
  classifyNightWatchStatus,
  parseSleepDisabled,
  isAuthorizationCanceled,
  statusMessage,
} from "./status";
import {
  LOCK_STALE_AFTER_MS,
  lockLeaseExpired,
  parseLockOwnerToken,
  serializeLockOwner,
} from "./toggle-lock";

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.join(
  homedir(),
  "Library",
  "Caches",
  "com.yuchen.agent-night-watch",
);
const STATE_FILE = path.join(CACHE_DIR, "session.json");
const LEGACY_STATE_FILE = path.join(CACHE_DIR, "session");
const LOCK_DIR = path.join(CACHE_DIR, "toggle.lock");
const SESSION_PREFIX = path.join(CACHE_DIR, "session.");
const START_TIMEOUT_MS = 120_000;
const STOP_TIMEOUT_MS = 8_000;

interface SessionState {
  version: 2;
  launcherPid: number;
  sessionDir: string;
  startedAt: string;
  phase: SessionPhase;
}

export class NightWatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NightWatchError";
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function appleScriptQuote(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function installGuardScript(sessionDir: string): string {
  const source = path.join(environment.assetsPath, "night-watch-guard.sh");
  const target = path.join(sessionDir, "night-watch-guard.sh");
  copyFileSync(source, target);
  return target;
}

function ensureCacheDirectory(): void {
  mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });
}

function isSessionDirectory(candidate: string): boolean {
  return (
    path.dirname(candidate) === CACHE_DIR &&
    path.basename(candidate).startsWith("session.")
  );
}

function removeSessionFiles(sessionDir?: string): void {
  rmSync(STATE_FILE, { force: true });
  if (sessionDir && isSessionDirectory(sessionDir)) {
    rmSync(sessionDir, { recursive: true, force: true });
  }
}

function readSessionState(): SessionState | undefined {
  try {
    const state = JSON.parse(
      readFileSync(STATE_FILE, "utf8"),
    ) as Partial<SessionState>;
    if (
      state.version !== 2 ||
      !Number.isInteger(state.launcherPid) ||
      (state.launcherPid ?? 0) <= 1 ||
      typeof state.sessionDir !== "string" ||
      !isSessionDirectory(state.sessionDir) ||
      typeof state.startedAt !== "string" ||
      !["starting", "running", "stopping"].includes(state.phase ?? "")
    ) {
      return undefined;
    }
    return state as SessionState;
  } catch {
    return undefined;
  }
}

function writeSessionState(state: SessionState): void {
  ensureCacheDirectory();
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function processMatchesSession(state: SessionState): Promise<boolean> {
  if (!isProcessAlive(state.launcherPid)) return false;
  try {
    const { stdout } = await execFileAsync("/bin/ps", [
      "-ww",
      "-p",
      String(state.launcherPid),
      "-o",
      "command=",
    ]);
    return stdout.includes("osascript") && stdout.includes(state.sessionDir);
  } catch {
    return false;
  }
}

async function sleepIsDisabled(): Promise<boolean> {
  const { stdout } = await execFileAsync("/usr/bin/pmset", ["-g"]);
  return parseSleepDisabled(stdout);
}

function cleanLegacyStateIfSafe(disabled: boolean): void {
  if (disabled || !existsSync(LEGACY_STATE_FILE)) return;
  try {
    const [pidText, sessionDir] = readFileSync(LEGACY_STATE_FILE, "utf8")
      .trim()
      .split("\n");
    const pid = Number(pidText);
    if (Number.isInteger(pid) && pid > 1 && isProcessAlive(pid)) return;
    rmSync(LEGACY_STATE_FILE, { force: true });
    if (sessionDir && isSessionDirectory(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch {
    // A malformed legacy cache is non-authoritative and can be left alone.
  }
}

export async function getNightWatchStatus(): Promise<NightWatchStatus> {
  ensureCacheDirectory();
  const disabled = await sleepIsDisabled();
  cleanLegacyStateIfSafe(disabled);
  const state = readSessionState();

  if (!state) {
    if (existsSync(STATE_FILE)) removeSessionFiles();
    const kind = classifyNightWatchStatus({
      sleepDisabled: disabled,
      statePresent: false,
      processMatches: false,
      ready: false,
      stopped: false,
      stopRequested: false,
    });
    return { kind, sleepDisabled: disabled, message: statusMessage(kind) };
  }

  const processMatches = await processMatchesSession(state);
  const ready = existsSync(path.join(state.sessionDir, "ready"));
  const stopped = existsSync(path.join(state.sessionDir, "stopped"));
  const stopRequested = existsSync(path.join(state.sessionDir, "stop"));

  const kind = classifyNightWatchStatus({
    sleepDisabled: disabled,
    statePresent: true,
    processMatches,
    ready,
    stopped,
    stopRequested,
    phase: state.phase,
  });

  if (kind === "on-owned" && state.phase !== "running") {
    writeSessionState({ ...state, phase: "running" });
  }
  if (kind === "off" || kind === "on-external") {
    removeSessionFiles(state.sessionDir);
  }
  return { kind, sleepDisabled: disabled, message: statusMessage(kind) };
}

async function acquireLock(): Promise<() => void> {
  ensureCacheDirectory();
  const token = randomUUID();
  const ownerPath = path.join(LOCK_DIR, "owner");
  for (let attempt = 0; attempt < 70; attempt += 1) {
    try {
      mkdirSync(LOCK_DIR, { mode: 0o700 });
      writeFileSync(
        ownerPath,
        serializeLockOwner({
          version: 1,
          pid: process.pid,
          token,
          acquiredAt: new Date().toISOString(),
        }),
        { mode: 0o600 },
      );
      return () => {
        try {
          if (parseLockOwnerToken(readFileSync(ownerPath, "utf8")) === token)
            rmSync(LOCK_DIR, { recursive: true, force: true });
        } catch {
          // A newer operation may already own the lock.
        }
      };
    } catch {
      try {
        const lockModifiedAt = existsSync(ownerPath)
          ? statSync(ownerPath).mtimeMs
          : statSync(LOCK_DIR).mtimeMs;
        if (lockLeaseExpired(lockModifiedAt)) {
          rmSync(LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      await delay(100);
    }
  }
  throw new NightWatchError(
    `Another Night Watch toggle is still running. Try again in ${Math.ceil(LOCK_STALE_AFTER_MS / 1000)} seconds.`,
  );
}

async function withToggleLock<T>(operation: () => Promise<T>): Promise<T> {
  const release = await acquireLock();
  try {
    return await operation();
  } finally {
    release();
  }
}

function readLogTail(logPath: string): string {
  try {
    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    return lines.at(-1) ?? "";
  } catch {
    return "";
  }
}

async function startNightWatchUnlocked(): Promise<void> {
  const current = await getNightWatchStatus();
  if (current.kind === "on-owned") return;
  if (current.kind === "starting" || current.kind === "stopping") {
    throw new NightWatchError(
      "Night Watch is already changing state. Try again shortly.",
    );
  }
  if (current.kind === "on-external") {
    throw new NightWatchError(
      "Sleep is already disabled by another tool. Use the coffee-cup menu to review it.",
    );
  }

  const sessionDir = mkdtempSync(SESSION_PREFIX);
  const logPath = path.join(sessionDir, "guard.log");
  const logFd = openSync(logPath, "a", 0o600);
  const guardPath = installGuardScript(sessionDir);
  const rootCommand = `/bin/sh ${shellQuote(guardPath)} ${shellQuote(sessionDir)}`;
  const script = `with timeout of 2147483647 seconds\n  do shell script "${appleScriptQuote(rootCommand)}" with administrator privileges\nend timeout`;
  const child = spawn("/usr/bin/osascript", ["-e", script], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);

  if (!child.pid) {
    removeSessionFiles(sessionDir);
    throw new NightWatchError(
      "Could not start the administrator authorization process.",
    );
  }
  child.unref();

  const state: SessionState = {
    version: 2,
    launcherPid: child.pid,
    sessionDir,
    startedAt: new Date().toISOString(),
    phase: "starting",
  };
  writeSessionState(state);

  const startedAt = Date.now();
  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    if (
      existsSync(path.join(sessionDir, "ready")) &&
      (await sleepIsDisabled())
    ) {
      writeSessionState({ ...state, phase: "running" });
      return;
    }
    if (!isProcessAlive(child.pid)) break;
    await delay(100);
  }

  if (isProcessAlive(child.pid)) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // The authorization process may have exited between checks.
    }
  }
  for (let attempt = 0; attempt < 50 && (await sleepIsDisabled()); attempt += 1)
    await delay(100);

  const errorTail = readLogTail(logPath);
  if (!(await sleepIsDisabled())) removeSessionFiles(sessionDir);
  if (isAuthorizationCanceled(errorTail)) {
    throw new NightWatchError(
      "Not enabled: administrator authorization was canceled.",
    );
  }
  throw new NightWatchError(
    errorTail
      ? `Not enabled: ${errorTail}`
      : "Not enabled: administrator authorization was not granted.",
  );
}

async function stopNightWatchUnlocked(): Promise<void> {
  const current = await getNightWatchStatus();
  if (current.kind === "off") return;
  if (current.kind === "on-external") {
    throw new NightWatchError(
      "This state was not created by Agent Night Watch. Use Restore Normal Sleep from the menu.",
    );
  }
  if (current.kind === "starting") {
    throw new NightWatchError(
      "Administrator authorization is still open. Complete or cancel it first.",
    );
  }

  const state = readSessionState();
  if (!state)
    throw new NightWatchError(
      "The owned Night Watch session was not found. System state was not changed.",
    );
  writeSessionState({ ...state, phase: "stopping" });
  writeFileSync(path.join(state.sessionDir, "reason"), "manual\n", {
    mode: 0o600,
  });
  writeFileSync(path.join(state.sessionDir, "stop"), "\n", { mode: 0o600 });

  const startedAt = Date.now();
  while (Date.now() - startedAt < STOP_TIMEOUT_MS) {
    const disabled = await sleepIsDisabled();
    if (!disabled && existsSync(path.join(state.sessionDir, "stopped"))) {
      removeSessionFiles(state.sessionDir);
      return;
    }
    await delay(100);
  }

  if (!(await sleepIsDisabled())) {
    removeSessionFiles(state.sessionDir);
    return;
  }
  throw new NightWatchError(
    "Night Watch did not stop: sleep is still disabled. Use the coffee-cup menu to recover.",
  );
}

export async function startNightWatch(): Promise<void> {
  await withToggleLock(startNightWatchUnlocked);
}

export async function stopNightWatch(): Promise<void> {
  await withToggleLock(stopNightWatchUnlocked);
}

export async function toggleNightWatch(): Promise<"on" | "off"> {
  return withToggleLock(async () => {
    const current = await getNightWatchStatus();
    if (current.kind === "off") {
      await startNightWatchUnlocked();
      return "on";
    }
    if (current.kind === "on-owned") {
      await stopNightWatchUnlocked();
      return "off";
    }
    if (current.kind === "on-external") {
      throw new NightWatchError(
        "Sleep is disabled by another tool or leftover state. Review it from the coffee-cup menu.",
      );
    }
    throw new NightWatchError(
      "Night Watch is already changing state. Try again shortly.",
    );
  });
}

export async function forceRestoreSleep(): Promise<void> {
  await withToggleLock(async () => {
    const command = "/usr/bin/pmset -a disablesleep 0";
    const script = `do shell script "${appleScriptQuote(command)}" with administrator privileges`;
    try {
      await execFileAsync("/usr/bin/osascript", ["-e", script]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isAuthorizationCanceled(message))
        throw new NightWatchError("Restore canceled.");
      throw new NightWatchError(`Restore failed: ${message}`);
    }
    if (await sleepIsDisabled())
      throw new NightWatchError(
        "The administrator command completed, but sleep is still disabled.",
      );
    const state = readSessionState();
    removeSessionFiles(state?.sessionDir);
  });
}
