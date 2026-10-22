import { environment } from "@raycast/api";
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Preferences {
  duration: string;
  strictKeyboardLock: boolean;
  showExitHint: boolean;
}

export interface CleanerOptions {
  seconds: number;
  lockKeyboard: boolean;
  showHint: boolean;
}

const isWindows = process.platform === "win32";
const helperFileName = isWindows ? "ScreenCleaner.ps1" : "ScreenCleaner";

export const helperPath = join(environment.supportPath, helperFileName);
export const pidPath = join(environment.supportPath, "screen-cleaner.pid");
export const logPath = join(environment.supportPath, "screen-cleaner.log");

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isOurProcess(pid: number): boolean {
  if (isWindows) {
    try {
      const output = execFileSync("tasklist.exe", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
      return output.toLowerCase().includes("powershell.exe");
    } catch {
      return false;
    }
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
  if (!existsSync(pidPath)) return null;

  const pid = Number(readFileSync(pidPath, "utf8").trim());
  if (!Number.isInteger(pid) || pid <= 0 || !isAlive(pid) || !isOurProcess(pid)) {
    rmSync(pidPath, { force: true });
    return null;
  }

  return pid;
}

export function startHelper(options: CleanerOptions): number {
  const helper = ensureHelper();
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
        ],
        { detached: true, stdio: "ignore" },
      );

  child.unref();

  if (!child.pid) {
    throw new Error("Failed to start ScreenCleaner.");
  }

  writeFileSync(pidPath, String(child.pid));
  return child.pid;
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
    rmSync(pidPath, { force: true });
    return true;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    rmSync(pidPath, { force: true });
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

  rmSync(pidPath, { force: true });
  return true;
}
