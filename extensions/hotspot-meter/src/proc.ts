// Small process and file helpers shared by the sampler.
import { execFile } from "node:child_process";
import fs from "node:fs";

export function sh(cmd: string, args: string[], timeout = 5000): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 32 * 1024 * 1024, killSignal: "SIGKILL" }, (_e, stdout) =>
      resolve(String(stdout ?? "")),
    );
  });
}

export function readJSON<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeAtomic(file: string, data: string) {
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmp, data, { flush: true });
  fs.renameSync(tmp, file);
}

export const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// Stops pid only if it is still the program we started (pids get reused).
export async function stopIfOurs(pid: number, comm: string) {
  if (!alive(pid)) return;
  if ((await sh("/bin/ps", ["-o", "comm=", "-p", String(pid)])).trim() !== comm) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }
}
