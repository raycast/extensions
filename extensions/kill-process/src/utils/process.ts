import { exec } from "child_process";
import { constants } from "fs";
import { access } from "fs/promises";
import { Process } from "../types";
import {
  isWindows,
  getKillAllCommand,
  getKillCommand,
  getKillTreeCommand,
  getProcessListCommand,
  getProcessPerformanceCommand,
  getProcessRunningCheckCommand,
  getRestartLaunchPath,
  getRestartCommand,
  getPlatformSpecificErrorHelp,
  parseProcessLine,
  parseWindowsProcesses,
  parseWindowsPerformanceData,
  getProcessType,
  getAppName,
  hasRestartLaunchPath,
} from "./platform";

const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };
const PROCESS_EXIT_POLL_INTERVAL_MS = 250;
const PROCESS_EXIT_TIMEOUT_MS = 5000;

function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, EXEC_OPTIONS, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function sleepForProcessExitPollInterval(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, PROCESS_EXIT_POLL_INTERVAL_MS);
  });
}

async function isProcessRunning(processId: number): Promise<boolean> {
  try {
    await executeCommand(getProcessRunningCheckCommand(processId));
    return true;
  } catch {
    return false;
  }
}

async function waitForProcessExit(processId: number): Promise<void> {
  const timeoutAt = Date.now() + PROCESS_EXIT_TIMEOUT_MS;

  while (Date.now() < timeoutAt) {
    if (!(await isProcessRunning(processId))) {
      return;
    }

    await sleepForProcessExitPollInterval();
  }

  throw new Error("The process did not fully exit before restart.");
}

async function assertRestartLaunchPathExists(process: Process): Promise<void> {
  const launchPath = getRestartLaunchPath(process);
  if (!launchPath) {
    throw new Error("The selected process cannot be restarted because its launch path is unavailable.");
  }

  try {
    await access(launchPath, constants.F_OK);
  } catch {
    throw new Error("The selected process cannot be restarted because its launch path no longer exists.");
  }
}

/**
 * Fetch all running processes
 * On Windows, CPU values are placeholders (0) until fetchProcessPerformance() is called
 */
export async function fetchRunningProcesses(): Promise<Process[]> {
  return new Promise((resolve, reject) => {
    exec(getProcessListCommand(), EXEC_OPTIONS, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }

      const parsed = isWindows
        ? parseWindowsProcesses(stdout)
        : (stdout.split("\n").map(parseProcessLine).filter(Boolean) as Partial<Process>[]);

      const processes = parsed
        .filter((p) => p?.processName)
        .map((p) => {
          const path = p.path || "";
          const processName = p.processName || "";
          const type = getProcessType(path);

          return {
            id: p.id || 0,
            pid: p.pid || 0,
            cpu: p.cpu || 0,
            mem: p.mem || 0,
            type,
            path,
            processName,
            appName: type === "app" ? getAppName(path, processName) : undefined,
          } as Process;
        })
        .filter((p) => p.processName !== "");

      resolve(processes);
    });
  });
}

/**
 * Fetch CPU usage for all processes (Windows only)
 * Uses WMI performance counters for accurate real-time CPU percentage
 * Returns empty map on macOS (CPU is already included in fetchRunningProcesses)
 */
export async function fetchProcessPerformance(): Promise<Map<number, number>> {
  if (!isWindows) {
    return new Map();
  }

  return new Promise((resolve) => {
    exec(getProcessPerformanceCommand(), EXEC_OPTIONS, (err, stdout) => {
      if (err) {
        console.error("Failed to fetch CPU performance data:", err);
        resolve(new Map());
        return;
      }
      resolve(parseWindowsPerformanceData(stdout));
    });
  });
}

export async function terminateProcess(processId: number, force = false): Promise<void> {
  await executeCommand(getKillCommand(processId, force));
}

export async function terminateProcessesByName(processName: string, force = false): Promise<void> {
  await executeCommand(getKillAllCommand(processName, force));
}

export async function terminateProcessTree(processId: number, force = false): Promise<void> {
  await executeCommand(getKillTreeCommand(processId, force));
}

export async function relaunchProcess(process: Process): Promise<void> {
  if (!hasRestartLaunchPath(process)) {
    throw new Error("The selected process cannot be restarted because its launch path is unavailable.");
  }

  await assertRestartLaunchPathExists(process);

  const restartCommand = getRestartCommand(process);
  if (!restartCommand) {
    throw new Error("The selected process does not have a supported restart command on this platform.");
  }

  await executeCommand(restartCommand);
}

export async function restartProcess(process: Process, force = false): Promise<void> {
  if (!hasRestartLaunchPath(process)) {
    throw new Error("The selected process cannot be restarted because its launch path is unavailable.");
  }

  try {
    await terminateProcessTree(process.id, force);
  } catch (error) {
    const help = getPlatformSpecificErrorHelp("restart", force);
    const details = error instanceof Error ? error.message : "Unknown error";
    const message = help.message ? `${help.message}: ${details}` : details;
    throw new Error(message);
  }

  await waitForProcessExit(process.id);
  await relaunchProcess(process);
}
