import { exec } from "child_process";
import { Process } from "../types";
import { getProcessListCommand, parseProcessLine, getProcessType, getAppName } from "./platform";

/**
 * Get all processes from the system
 * @returns Promise<Process[]> List of processes
 */
export async function fetchRunningProcesses(): Promise<Process[]> {
  return new Promise((resolve, reject) => {
    const command = getProcessListCommand();

    exec(command, (err, stdout) => {
      if (err != null) {
        reject(err);
        return;
      }

      const processes = stdout
        .split("\n")
        .map((line) => {
          const parsed = parseProcessLine(line);
          if (!parsed || !parsed.processName) return null;

          const type = getProcessType(parsed.path || "");
          const appName = type === "app" ? getAppName(parsed.path || "", parsed.processName || "") : undefined;

          return {
            id: parsed.id || 0,
            pid: parsed.pid || 0,
            cpu: parsed.cpu || 0,
            mem: parsed.mem || 0,
            type,
            path: parsed.path || "",
            processName: parsed.processName || "",
            appName,
          } as Process;
        })
        .filter((process): process is Process => process !== null && process.processName !== "");

      resolve(processes);
    });
  });
}
