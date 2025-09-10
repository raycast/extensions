import { exec } from "child_process";
import { Process } from "../types";

/**
 * Get all processes from the system
 * @returns Promise<Process[]> List of processes
 */
export async function fetchRunningProcesses(): Promise<Process[]> {
  return new Promise((resolve, reject) => {
    exec(`ps -eo pid,ppid,pcpu,rss,comm`, (err, stdout) => {
      if (err != null) {
        reject(err);
        return;
      }

      const processes = stdout
        .split("\n")
        .map((line) => {
          const defaultValue = ["", "", "", "", "", ""];
          const regex = /(\d+)\s+(\d+)\s+(\d+[.|,]\d+)\s+(\d+)\s+(.*)/;
          const [, id, pid, cpu, mem, path] = line.match(regex) ?? defaultValue;
          const processName = path.match(/[^/]*[^/]*$/i)?.[0] ?? "";
          const isPrefPane = path.includes(".prefPane");
          const isApp = path.includes(".app/");

          return {
            id: parseInt(id),
            pid: parseInt(pid),
            cpu: parseFloat(cpu),
            mem: parseInt(mem),
            type: isPrefPane ? "prefPane" : isApp ? "app" : "binary",
            path,
            processName,
            appName: isApp ? path.match(/(?<=\/)[^/]+(?=\.app\/)/)?.[0] : undefined,
          } as Process;
        })
        .filter((process) => process.processName !== "");
      resolve(processes);
    });
  });
}
