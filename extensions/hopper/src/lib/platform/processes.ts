// PURE: questions about the process table (Platform.processes), shared by the tab and agent levels.

import type { App, Process } from "./model";

const MAX_DEPTH = 64;

/** The app whose process is `pid` or one of its ancestors. */
export function appOfProcess(pid: number, processes: Map<number, Process>, apps: App[]): App | undefined {
  const byPid = new Map(apps.filter((a) => a.pid).map((a) => [a.pid!, a]));
  for (let current = pid, depth = 0; current > 1 && depth < MAX_DEPTH; depth++) {
    const app = byPid.get(current);
    if (app) return app;
    const parent = processes.get(current)?.ppid;
    if (parent === undefined || parent === current) return undefined;
    current = parent;
  }
  return undefined;
}

/** Whether `pid` runs inside herdr (its server process is an ancestor). */
export function inHerdr(pid: number, processes: Map<number, Process>): boolean {
  for (let current = processes.get(pid), depth = 0; current && depth < MAX_DEPTH; depth++) {
    if (current.name === "herdr" && current.pid !== pid) return true;
    current = processes.get(current.ppid);
  }
  return false;
}

/**
 * The most recent herdr client (it runs in a terminal; herdr's server has no tty) attached to the session whose API
 * socket is `socket`: clients connect to the session's `herdr-client.sock`, next to its `herdr.sock`. If no client's
 * connections could be read, the most recent client of any session.
 */
export function herdrClient(processes: Process[], socket: string): Process | undefined {
  const clients = processes.filter((p) => p.name === "herdr" && p.tty).sort((a, b) => b.startedAt - a.startedAt);
  if (!clients.some((c) => c.sockets?.length)) return clients[0];
  const clientSocket = socket.replace(/herdr\.sock$/, "herdr-client.sock");
  return clients.find((c) => c.sockets?.includes(clientSocket));
}
