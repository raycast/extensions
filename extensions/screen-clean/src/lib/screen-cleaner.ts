import { environment } from "@raycast/api";
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CleanerOptions {
  seconds: number;
  lockKeyboard: boolean;
  showHint: boolean;
}

interface HelperState {
  pid: number;
  startedAt: number;
}

const isWindows = process.platform === "win32";
const helperFileName = isWindows ? "ScreenCleaner.ps1" : "ScreenCleaner";

export const helperPath = join(environment.supportPath, helperFileName);
export const pidPath = join(environment.supportPath, "screen-cleaner.pid");
export const readyPath = join(environment.supportPath, "screen-cleaner.ready");
export const logPath = join(environment.supportPath, "screen-cleaner.log");

const READY_TIMEOUT_MS = 15_000;
const PROCESS_START_TOLERANCE_MS = 60_000;

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readState(): HelperState | null {
  try {
    const data = JSON.parse(readFileSync(pidPath, "utf8"));
    if (Number.isInteger(data.pid) && data.pid > 0 && Number.isFinite(data.startedAt)) {
      return { pid: data.pid, startedAt: data.startedAt };
    }
  } catch {
    // Missing or legacy PID file.
  }
  return null;
}

function writeState(pid: number): void {
  writeFileSync(pidPath, JSON.stringify({ pid, startedAt: Date.now() } satisfies HelperState));
}

function cleanupState(): void {
  rmSync(pidPath, { force: true });
  rmSync(readyPath, { force: true });
}

interface WindowsProcessInfo {
  name: string;
  commandLine: string;
  createdAt: number;
}

function getWindowsProcessInfo(pid: number): WindowsProcessInfo | null {
  const command = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"`,
    "if ($p) { [pscustomobject]@{ Name = $p.Name; CommandLine = $p.CommandLine; CreationDate = $p.CreationDate.ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress }",
  ].join("; ");

  try {
    const encodedCommand = Buffer.from(command, "utf16le").toString("base64");
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 5000,
      },
    ).trim();
    if (!output) return null;

    const info = JSON.parse(output);
    const createdAt = Date.parse(info.CreationDate);
    if (!Number.isFinite(createdAt)) return null;

    return {
      name: String(info.Name ?? ""),
      commandLine: String(info.CommandLine ?? ""),
      createdAt,
    };
  } catch {
    return null;
  }
}

function isOurProcess(pid: number, startedAt: number): boolean {
  if (isWindows) {
    const info = getWindowsProcessInfo(pid);
    if (!info) return false;
    if (info.name.toLowerCase() !== "powershell.exe") return false;
    if (!info.commandLine.toLowerCase().includes("screencleaner.ps1")) return false;

    // Reject a recycled PID: the process must have been created around the
    // time we recorded the helper state.
    return Math.abs(info.createdAt - startedAt) <= PROCESS_START_TOLERANCE_MS;
  }

  try {
    const command = execFileSync("/bin/ps", ["-p", String(pid), "-o", "comm="], {
      encoding: "utf8",
    }).trim();
    return command.endsWith("ScreenCleaner");
  } catch {
    return false;
  }
}

function killPid(pid: number): void {
  try {
    if (isWindows) {
      execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    // Already gone.
  }
}

function startupErrorMessage(fallback: string): string {
  try {
    const log = readFileSync(logPath, "utf8").trim();
    const firstLine = log.split(/\r?\n/).find((line) => line.trim().length > 0);
    if (firstLine) {
      return firstLine.length > 300 ? `${firstLine.slice(0, 300)}…` : firstLine;
    }
  } catch {
    // No log on this platform, or the helper never wrote one.
  }
  return fallback;
}

async function waitForReady(pid: number, getSpawnError: () => Error | null): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const spawnError = getSpawnError();
    if (spawnError) throw new Error(spawnError.message);

    if (existsSync(readyPath)) {
      if (!isAlive(pid)) {
        throw new Error(startupErrorMessage("ScreenCleaner exited before it was ready."));
      }
      return;
    }

    if (!isAlive(pid)) {
      throw new Error(startupErrorMessage("ScreenCleaner exited before it was ready."));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(startupErrorMessage("ScreenCleaner did not become ready in time."));
}

/**
 * Raycast's assets directory is not guaranteed to preserve the executable bit,
 * and it can be replaced on every extension update. Keep a stable copy in the
 * extension's support directory instead. A stable path also keeps the macOS
 * Accessibility permission bound to one binary.
 */
export function ensureHelper(): string {
  mkdirSync(environment.supportPath, { recursive: true });

  const source = join(environment.assetsPath, helperFileName);
  if (!existsSync(source)) {
    throw new Error(
      `ScreenCleaner helper is missing (${helperFileName}). Run \`npm run build:helper\` before starting the extension.`,
    );
  }

  let needsCopy = !existsSync(helperPath);
  if (!needsCopy) {
    const sourceStat = statSync(source);
    const destinationStat = statSync(helperPath);
    needsCopy = sourceStat.size !== destinationStat.size || sourceStat.mtimeMs > destinationStat.mtimeMs;
  }

  if (needsCopy) {
    copyFileSync(source, helperPath);
  }
  if (!isWindows) {
    chmodSync(helperPath, 0o755);
  }
  return helperPath;
}

export function readRunningPid(): number | null {
  const state = readState();
  if (!state) {
    cleanupState();
    return null;
  }

  if (!isAlive(state.pid) || !isOurProcess(state.pid, state.startedAt)) {
    cleanupState();
    return null;
  }

  return state.pid;
}

export async function startHelper(options: CleanerOptions): Promise<number> {
  const helper = ensureHelper();
  cleanupState();
  rmSync(logPath, { force: true });

  let spawnError: Error | null = null;

  const child = isWindows
    ? spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-STA",
          "-WindowStyle",
          "Hidden",
          "-File",
          helper,
          "-Seconds",
          String(options.seconds),
          "-LockKeyboard",
          options.lockKeyboard ? "1" : "0",
          "-ShowHint",
          options.showHint ? "1" : "0",
          "-ReadyFile",
          readyPath,
          "-LogPath",
          logPath,
        ],
        { detached: true, stdio: "ignore", windowsHide: true },
      )
    : spawn(
        helper,
        [
          "--seconds",
          String(options.seconds),
          ...(options.lockKeyboard ? ["--lock-keyboard"] : []),
          ...(options.showHint ? [] : ["--no-hint"]),
          "--ready-file",
          readyPath,
        ],
        { detached: true, stdio: "ignore" },
      );

  child.once("error", (error) => {
    spawnError = error;
  });
  child.unref();

  if (!child.pid) {
    throw new Error("Failed to start ScreenCleaner.");
  }

  try {
    writeState(child.pid);
    await waitForReady(child.pid, () => spawnError);
    return child.pid;
  } catch (error) {
    killPid(child.pid);
    cleanupState();
    throw error;
  }
}

export async function stopHelper(): Promise<boolean> {
  const pid = readRunningPid();
  if (pid === null) return false;

  if (isWindows) {
    try {
      execFileSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // The process may have exited between the check and taskkill.
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    const stopped = !isAlive(pid);
    if (stopped) {
      cleanupState();
    }
    return stopped;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    cleanupState();
    return false;
  }

  // The helper fades out over ~300 ms.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isAlive(pid)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (isAlive(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }

  cleanupState();
  return true;
}
