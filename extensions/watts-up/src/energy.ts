import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface EnergyProcess {
  pid: number;
  name: string;
  /** Energy impact score, same scale as Activity Monitor (unitless) */
  power: number;
  isApp: boolean;
}

/**
 * Top processes by macOS "energy impact", via `top -o power`.
 * Takes two samples (~2s) — the first sample's power values are meaningless.
 */
export async function getTopEnergyProcesses(
  count = 8,
): Promise<EnergyProcess[]> {
  const { stdout } = await execAsync(
    `/usr/bin/top -l 2 -o power -n ${count} -stats pid,command,power`,
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  // Output contains two samples; parse rows after the last "PID COMMAND POWER" header
  const lines = stdout.split("\n");
  const lastHeader = lines.reduce(
    (acc, line, i) => (/^PID\s+COMMAND\s+POWER/.test(line) ? i : acc),
    -1,
  );
  if (lastHeader === -1) return [];

  const procs: EnergyProcess[] = [];
  for (const line of lines.slice(lastHeader + 1)) {
    const m = line.match(/^(\d+)\s+(.*?)\s+([\d.]+)\s*$/);
    if (m)
      procs.push({
        pid: Number(m[1]),
        name: m[2].trim(),
        power: Number(m[3]),
        isApp: false,
      });
  }

  // top truncates command names to ~16 chars; resolve full names via ps
  if (procs.length > 0) {
    try {
      const pids = procs.map((p) => p.pid).join(",");
      const { stdout: psOut } = await execAsync(
        `/bin/ps -o pid=,comm= -p ${pids}`,
      );
      const fullNames = new Map<number, string>();
      for (const line of psOut.split("\n")) {
        const m = line.match(/^\s*(\d+)\s+(.+)$/);
        if (m) fullNames.set(Number(m[1]), m[2].trim());
      }
      for (const proc of procs) {
        const full = fullNames.get(proc.pid);
        if (full) {
          proc.isApp = full.includes(".app/");
          proc.name = full.split("/").pop() ?? proc.name;
        }
      }
    } catch {
      // process may have exited between top and ps; keep truncated names
    }
  }

  // drop the top process we spawned to take the measurement
  return procs.filter((p) => p.power > 0 && p.name !== "top");
}
