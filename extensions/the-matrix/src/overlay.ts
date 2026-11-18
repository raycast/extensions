import { LocalStorage, environment } from "@raycast/api";
import { spawn, execFile } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const overlayPidKey = "matrix-overlay-pid";
const overlayProcessFlag = "--the-matrix-raycast-overlay";
const overlayStopFileName = "matrix-overlay.stop";
const overlayRunnerPath = "/usr/bin/osascript";
const gracefulStopTimeoutMs = 7400;
const forceStopTimeoutMs = 500;

type StartResult = {
  alreadyRunning: boolean;
  pid?: number;
};

type StartOptions = {
  soundsOn: boolean;
  speedMs: number;
};

type StopResult = {
  stopped: boolean;
  fallbackCount: number;
};

export async function startOverlay(
  options: StartOptions,
): Promise<StartResult> {
  const storedPid = await getStoredPid();

  if (storedPid && isProcessRunning(storedPid)) {
    return { alreadyRunning: true, pid: storedPid };
  }

  await LocalStorage.removeItem(overlayPidKey);

  const mainScriptPath = path.join(
    environment.assetsPath,
    "overlay",
    "main.jxa",
  );
  const overlayDirectoryPath = path.dirname(mainScriptPath);
  const stopFilePath = getStopFilePath();
  await assertExecutable(overlayRunnerPath);
  await assertReadable(mainScriptPath);
  await mkdir(environment.supportPath, { recursive: true });
  await rm(stopFilePath, { force: true });

  const child = spawn(
    overlayRunnerPath,
    [
      "-l",
      "JavaScript",
      mainScriptPath,
      "--",
      overlayProcessFlag,
      "--stop-file",
      stopFilePath,
      "--overlay-dir",
      overlayDirectoryPath,
      "--audio",
      options.soundsOn ? "1" : "0",
      "--speed",
      String(options.speedMs),
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  child.unref();

  if (!child.pid) {
    throw new Error("Matrix overlay launched without a process ID");
  }

  await LocalStorage.setItem(overlayPidKey, String(child.pid));

  return { alreadyRunning: false, pid: child.pid };
}

export async function isOverlayRunning(): Promise<boolean> {
  const storedPid = await getStoredPid();

  return Boolean(storedPid && isProcessRunning(storedPid));
}

export async function stopOverlay(): Promise<StopResult> {
  let stopped = false;
  const storedPid = await getStoredPid();

  if (storedPid && isProcessRunning(storedPid)) {
    await requestGracefulStop();
    stopped = true;
    await waitForExit(storedPid, gracefulStopTimeoutMs);

    if (isProcessRunning(storedPid)) {
      process.kill(storedPid, "SIGKILL");
      await waitForExit(storedPid, forceStopTimeoutMs);
    }
  }

  await LocalStorage.removeItem(overlayPidKey);
  await rm(getStopFilePath(), { force: true });

  const fallbackCount = await stopMatchingOverlayProcesses();
  stopped = stopped || fallbackCount > 0;

  return { stopped, fallbackCount };
}

async function requestGracefulStop(): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(getStopFilePath(), String(Date.now()));
}

function getStopFilePath(): string {
  return path.join(environment.supportPath, overlayStopFileName);
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function getStoredPid(): Promise<number | undefined> {
  const value = await LocalStorage.getItem<string>(overlayPidKey);
  const pid = Number(value);

  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

async function assertExecutable(filePath: string): Promise<void> {
  if (!(await canAccess(filePath))) {
    throw new Error(`Cannot execute ${filePath}`);
  }
}

async function assertReadable(filePath: string): Promise<void> {
  if (!(await canAccess(filePath))) {
    throw new Error(`Cannot read ${filePath}`);
  }
}

async function canAccess(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pid: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessRunning(pid)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function stopMatchingOverlayProcesses(): Promise<number> {
  if (process.platform === "win32") {
    return 0;
  }

  const matchingPids = await findMatchingOverlayPids();

  for (const pid of matchingPids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore processes that exited between `ps` and `kill`.
    }
  }

  return matchingPids.length;
}

async function findMatchingOverlayPids(): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="]);

    return stdout
      .split("\n")
      .filter((line) => line.includes(overlayProcessFlag))
      .map((line) => Number(line.trim().match(/^(\d+)/)?.[1]))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
      .filter((pid) => pid !== process.pid && pid !== process.ppid);
  } catch {
    return [];
  }
}
