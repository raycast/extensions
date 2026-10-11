import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);
export interface ListeningPort {
  id: string;
  pid: number;
  port: number;
  address: string;
  name: string;
  path: string;
  elapsed: string;
}

export function parsePorts(lsof: string, ps: string): ListeningPort[] {
  const processes = new Map<number, { elapsed: string; path: string }>();
  for (const line of ps.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
    if (match)
      processes.set(Number(match[1]), { elapsed: match[2], path: match[3] });
  }
  const ports = new Map<string, ListeningPort>();
  let pid = 0;
  let name = "";
  for (const line of lsof.split("\n")) {
    if (line.startsWith("p")) {
      pid = Number(line.slice(1));
      name = "";
    }
    if (line.startsWith("c")) name = line.slice(1);
    if (!line.startsWith("n") || !Number.isInteger(pid) || pid <= 1) continue;
    const match = line.slice(1).match(/^(.*):(\d+)$/);
    if (!match) continue;
    const port = Number(match[2]);
    if (port < 1 || port > 65535) continue;
    const id = `${pid}:${port}`;
    const process = processes.get(pid);
    ports.set(id, {
      id,
      pid,
      port,
      address: match[1],
      name,
      path: process?.path ?? name,
      elapsed: process?.elapsed ?? "—",
    });
  }
  return [...ports.values()].sort((a, b) => a.port - b.port || a.pid - b.pid);
}
export async function scanPorts(): Promise<ListeningPort[]> {
  const options = {
    timeout: 10_000,
    maxBuffer: 4 * 1024 * 1024,
    encoding: "utf8" as const,
  };
  const lsof = await execute(
    "/usr/sbin/lsof",
    ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn"],
    options,
  ).catch((error: unknown) => {
    const result = error as { code?: number; stdout?: string; stderr?: string };
    if (result.code === 1 && !result.stdout && !result.stderr)
      return { stdout: "" };
    throw error;
  });
  const ps = await execute("/bin/ps", ["-axo", "pid=,etime=,comm="], options);
  return parsePorts(lsof.stdout, ps.stdout);
}
export async function terminatePort(
  listener: ListeningPort,
  force: boolean,
): Promise<void> {
  // Revalidate the selected listener before signaling a potentially recycled PID.
  const current = (await scanPorts()).find((port) => port.id === listener.id);
  if (
    !current ||
    current.path !== listener.path ||
    listener.pid === process.pid
  ) {
    throw new Error(
      "This listener changed or exited. Refresh the list before trying again.",
    );
  }
  process.kill(listener.pid, force ? "SIGKILL" : "SIGTERM");
}
