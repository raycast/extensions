import { exec } from "child_process";
import { Process, PortProcess } from "../types";
import {
  isWindows,
  getProcessListCommand,
  getProcessPerformanceCommand,
  getPortListCommand,
  getCommandLineCommand,
  parseProcessLine,
  parseWindowsProcesses,
  parseWindowsPortProcesses,
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
 * Fetch all processes listening on a port
 */
export async function fetchPortProcesses(): Promise<PortProcess[]> {
  return new Promise((resolve) => {
    exec(getPortListCommand(), EXEC_OPTIONS, async (err, stdout) => {
      if (err && !stdout) {
        // lsof returns 1 if no ports are found, which is not an error for us
        resolve([]);
        return;
      }

      if (isWindows) {
        const parsed = parseWindowsPortProcesses(stdout) as PortProcess[];
        resolve(parsed.map((p) => ({ ...p, type: getProcessType(p.path) })));
        return;
      }

      // Parse lsof -F pcn output
      const lines = stdout.split("\n");
      const results: PortProcess[] = [];
      let currentPid = 0;
      let currentCommand = "";

      for (const line of lines) {
        if (line.startsWith("p")) {
          currentPid = parseInt(line.substring(1));
        } else if (line.startsWith("c")) {
          currentCommand = line.substring(1);
        } else if (line.startsWith("n")) {
          const name = line.substring(1);
          const portMatch = name.match(/:(\d+)$/);
          if (portMatch) {
            const port = parseInt(portMatch[1]);
            results.push({
              id: currentPid,
              pid: 0,
              port,
              protocol: "TCP",
              processName: currentCommand,
              path: "",
              cpu: 0,
              mem: 0,
              type: "binary",
              appName: undefined,
            } as PortProcess);
          }
        }
      }

      // Dedup results and fetch command lines
      const uniqueProcesses = Array.from(new Set(results.map((p) => `${p.id}-${p.port}`)))
        .map((key) => results.find((p) => `${p.id}-${p.port}` === key))
        .filter(Boolean) as PortProcess[];

      const enrichedProcesses = await Promise.all(
        uniqueProcesses.map(async (p) => {
          try {
            const commandLine = await new Promise<string>((res) => {
              exec(getCommandLineCommand(p.id), (err, stdout) => {
                res(err ? "" : stdout.trim());
              });
            });

            // Try to extract a meaningful path from the command line
            const pathMatch = commandLine.match(/^\S+/);
            const path = pathMatch ? pathMatch[0] : "";
            const type = getProcessType(path);

            return {
              ...p,
              commandLine,
              path,
              type,
              appName: type === "app" ? getAppName(path, p.processName) : undefined,
            } as PortProcess;
          } catch {
            return p;
          }
        }),
      );

      resolve(enrichedProcesses);
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
