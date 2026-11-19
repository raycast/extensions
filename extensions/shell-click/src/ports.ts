import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);
export interface ListeningPort {
  id: string;
  pid: number;
  port: number;
  address: string;
  family: "IPv4" | "IPv6";
  name: string;
  path: string;
  elapsed: string;
  startedAt?: string;
}

export function parsePorts(lsof: string, ps: string): ListeningPort[] {
  const processes = new Map<
    number,
    { startedAt: string; elapsed: string; path: string }
  >();
  for (const line of ps.split("\n")) {
    // ps lstart has five fields in the C locale, including a space-padded day.
    const match = line.match(/^\s*(\d+)\s+((?:\S+\s+){4}\S+)\s+(\S+)\s+(.+)$/);
    if (match)
      processes.set(Number(match[1]), {
        startedAt: match[2],
        elapsed: match[3],
        path: match[4],
      });
  }
  const ports = new Map<string, ListeningPort>();
  let pid = 0;
  let name = "";
  let family: string | undefined;
  for (const line of lsof.split("\n")) {
    if (line.startsWith("p")) {
      pid = Number(line.slice(1));
      name = "";
      family = undefined;
    }
    if (line.startsWith("c")) name = line.slice(1);
    if (line.startsWith("f")) family = undefined;
    if (line.startsWith("t")) family = line.slice(1);
    if (
      !line.startsWith("n") ||
      !Number.isInteger(pid) ||
      pid <= 1 ||
      (family !== "IPv4" && family !== "IPv6")
    )
      continue;
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
      family,
      name,
      path: process?.path ?? name,
      elapsed: process?.elapsed ?? "—",
      startedAt: process?.startedAt,
    });
  }
  return [...ports.values()].sort((a, b) => a.port - b.port || a.pid - b.pid);
}

export function listenerURL({ address, family, port }: ListeningPort): string {
  let host = address.replace(/^\[|\]$/g, "");
  if (host === "*") host = family === "IPv6" ? "::1" : "127.0.0.1";
  if (host === "0.0.0.0") host = "127.0.0.1";
  if (host === "::") host = "::1";
  return `http://${host.includes(":") ? `[${host}]` : host}:${port}`;
}

export async function scanPorts(): Promise<ListeningPort[]> {
  const options = {
    timeout: 10_000,
    maxBuffer: 4 * 1024 * 1024,
    encoding: "utf8" as const,
  };
  const lsof = await execute(
    "/usr/sbin/lsof",
    ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcftn"],
    options,
  ).catch((error: unknown) => {
    const result = error as { code?: number; stdout?: string };
    if (result.code === 1) return { stdout: result.stdout ?? "" };
    throw error;
  });
  const ps = await execute("/bin/ps", ["-axo", "pid=,lstart=,etime=,comm="], {
    ...options,
    env: { ...process.env, LC_ALL: "C", TZ: "UTC" },
  });
  return parsePorts(lsof.stdout, ps.stdout);
}

export function isSameListener(
  listener: ListeningPort,
  current: ListeningPort,
): boolean {
  return (
    current.id === listener.id &&
    current.path === listener.path &&
    listener.startedAt !== undefined &&
    current.startedAt === listener.startedAt
  );
}

export async function terminatePort(
  listener: ListeningPort,
  force: boolean,
): Promise<void> {
  // Revalidate the selected listener before signaling a potentially recycled PID.
  if (
    listener.pid === process.pid ||
    !(await scanPorts()).some((current) => isSameListener(listener, current))
  ) {
    throw new Error(
      "This listener changed or exited. Refresh the list before trying again.",
    );
  }
  process.kill(listener.pid, force ? "SIGKILL" : "SIGTERM");
}
