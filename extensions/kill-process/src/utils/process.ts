import { exec } from "child_process";
import { Process } from "../types";
import {
  isWindows,
  getProcessListCommand,
  getProcessPerformanceCommand,
  parseProcessLine,
  parseWindowsProcesses,
  parseWindowsPerformanceData,
  getProcessType,
  getAppName,
} from "./platform";

const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };

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
