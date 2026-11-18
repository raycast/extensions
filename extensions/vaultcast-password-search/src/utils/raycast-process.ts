import { execFileSync } from "child_process";

export function processName(pid: number): string {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    return "";
  }

  try {
    return execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function parentPid(pid: number): number | undefined {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    return undefined;
  }

  try {
    const parsed = Number.parseInt(
      execFileSync("ps", ["-p", String(pid), "-o", "ppid="], { encoding: "utf8" }).trim(),
      10,
    );
    return Number.isFinite(parsed) && parsed > 1 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getRaycastProcessId(): number {
  let pid = process.ppid;
  for (let index = 0; index < 10 && pid > 1; index++) {
    const name = processName(pid);
    if (/(^|\/)Raycast$/i.test(name) || /Raycast\.exe$/i.test(name)) {
      return pid;
    }

    const next = parentPid(pid);
    if (!next || next === pid) {
      break;
    }
    pid = next;
  }

  return process.ppid;
}
