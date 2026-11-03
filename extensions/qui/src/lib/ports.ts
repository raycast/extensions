import { listListeningPortsDarwin } from "~/lib/darwin";
import { detectStack } from "~/lib/stack";
import type { ListeningPort } from "~/lib/types";
import { listListeningPortsWindows } from "~/lib/windows";

export type { ListeningPort, ProcessInfo, Stack, StackItem } from "~/lib/types";

export async function listListeningPorts(): Promise<ListeningPort[]> {
  const ports = await (process.platform === "win32" ? listListeningPortsWindows() : listListeningPortsDarwin());
  // Several ports can share one process object; detect each process once.
  const processes = [...new Set(ports.map((p) => p.process))];
  await Promise.all(
    processes.map(async (proc) => {
      proc.stack = await detectStack(proc);
    }),
  );
  return ports;
}

export type KillResult = "terminated" | "still-running";

/**
 * Windows has no SIGTERM: Node ends the process outright whatever the signal,
 * so there's no graceful terminate to offer separately from a force kill.
 */
export const supportsGracefulTerminate = process.platform !== "win32";

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means it exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Sends `signal` to `pid` and waits up to `waitMs` for it to exit.
 * Throws a readable error when the process can't be signalled.
 */
export async function killProcess(pid: number, signal: "SIGTERM" | "SIGKILL", waitMs = 3000): Promise<KillResult> {
  try {
    process.kill(pid, signal);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "terminated";
    if (code === "EPERM")
      throw new Error(`Not permitted to kill PID ${pid}. It belongs to another user or the system.`);
    throw error;
  }
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return "terminated";
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return isAlive(pid) ? "still-running" : "terminated";
}
