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

/** The process of a herdr client, most recent first: it runs in a terminal; herdr's server has no tty. */
export function herdrClient(processes: Process[]): Process | undefined {
  return processes.filter((p) => p.name === "herdr" && p.tty).sort((a, b) => b.startedAt - a.startedAt)[0];
}
