import path from "node:path";
import { run } from "~/lib/exec";
import { findGitInfo } from "~/lib/git";
import type { ListeningPort, ProcessInfo } from "~/lib/types";

// Absolute paths: Raycast doesn't launch extensions with the user's shell PATH.
const LSOF = "/usr/sbin/lsof";
const PS = "/bin/ps";

interface RawListener {
  pid: number;
  lsofName: string;
  user?: string;
  port: number;
  address: string;
}

interface PsRow {
  pid: number;
  ppid: number;
  elapsedSeconds: number;
  rssKb: number;
  comm: string;
}

/**
 * Lists TCP listeners the way witr does on macOS: `lsof` for sockets, `ps` for
 * process details and ancestry, `lsof -d cwd` for working directories.
 *
 * Without root, lsof only reports sockets owned by the current user, which is
 * also the set of processes we're able to kill.
 */
export async function listListeningPortsDarwin(): Promise<ListeningPort[]> {
  const [lsofOut, psOut] = await Promise.all([
    run(LSOF, ["-nP", "-iTCP", "-sTCP:LISTEN", "-FpcLn"], { okExitCodes: [0, 1] }),
    run(PS, ["-axo", "pid=,ppid=,etime=,rss=,comm="]),
  ]);

  const listeners = parseLsofListeners(lsofOut);
  const table = parsePsTable(psOut);
  // First listener per PID carries lsof's name and user for that process.
  const firstByPid = new Map<number, RawListener>();
  for (const l of listeners) if (!firstByPid.has(l.pid)) firstByPid.set(l.pid, l);
  const pids = [...firstByPid.keys()];
  if (pids.length === 0) return [];

  const [commands, cwds] = await Promise.all([fetchCommands(pids), fetchCwds(pids)]);

  const processes = new Map<number, ProcessInfo>();
  for (const [pid, listener] of firstByPid) {
    const row = table.get(pid);
    const executable = row?.comm.startsWith("/") ? row.comm : undefined;
    const cwd = cwds.get(pid);
    processes.set(pid, {
      pid,
      ppid: row?.ppid ?? 0,
      name: row ? processName(row.comm, listener.lsofName) : listener.lsofName,
      command: commands.get(pid) ?? row?.comm ?? listener.lsofName,
      executable,
      appBundle: executable ? appBundleOf(executable) : undefined,
      user: listener.user,
      cwd,
      elapsedSeconds: row?.elapsedSeconds,
      rssKb: row?.rssKb,
      ancestry: ancestryOf(pid, table),
      git: cwd ? await findGitInfo(cwd) : undefined,
    });
  }

  // A process often listens on the same port over IPv4 and IPv6; merge those.
  const byKey = new Map<string, ListeningPort>();
  for (const l of listeners) {
    const id = `${l.pid}:${l.port}`;
    const existing = byKey.get(id);
    if (existing) {
      if (!existing.addresses.includes(l.address)) existing.addresses.push(l.address);
      continue;
    }
    const process = processes.get(l.pid);
    if (!process) continue;
    byKey.set(id, { id, port: l.port, protocol: "TCP", addresses: [l.address], process });
  }
  return [...byKey.values()].sort((a, b) => a.port - b.port || a.process.pid - b.process.pid);
}

/**
 * Parses `lsof -F pcLn` output. Each process set starts with `p<pid>` followed
 * by `c<command>` and `L<login>`; each file set starts with `f<fd>` and has
 * `n<address>` such as `*:3000`, `127.0.0.1:5432` or `[::1]:4399`.
 */
export function parseLsofListeners(out: string): RawListener[] {
  const result: RawListener[] = [];
  let pid = 0;
  let lsofName = "";
  let user: string | undefined;
  for (const line of out.split("\n")) {
    if (line.length < 2) continue;
    const value = line.slice(1);
    switch (line[0]) {
      case "p":
        pid = Number(value);
        lsofName = "";
        user = undefined;
        break;
      case "c":
        lsofName = value;
        break;
      case "L":
        user = value;
        break;
      case "n": {
        const idx = value.lastIndexOf(":");
        const port = Number(value.slice(idx + 1));
        if (idx < 0 || !Number.isInteger(port) || port <= 0) break;
        result.push({ pid, lsofName, user, port, address: value.slice(0, idx) });
        break;
      }
    }
  }
  return result;
}

function parsePsTable(out: string): Map<number, PsRow> {
  const table = new Map<number, PsRow>();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(.+)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    table.set(pid, {
      pid,
      ppid: Number(m[2]),
      elapsedSeconds: parseEtime(m[3]),
      rssKb: Number(m[4]),
      comm: m[5].trim(),
    });
  }
  return table;
}

/** Parses ps `etime`: `[[dd-]hh:]mm:ss`. */
export function parseEtime(etime: string): number {
  const [days, rest] = etime.includes("-") ? etime.split("-") : ["0", etime];
  const parts = rest.split(":").map(Number);
  while (parts.length < 3) parts.unshift(0);
  const [h, m, s] = parts;
  return Number(days) * 86400 + h * 3600 + m * 60 + s;
}

async function fetchCommands(pids: number[]): Promise<Map<number, string>> {
  // -ww: never truncate the command line.
  const out = await run(PS, ["-ww", "-o", "pid=,command=", "-p", pids.join(",")], { okExitCodes: [0, 1] }).catch(
    () => "",
  );
  const map = new Map<number, string>();
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(.+)$/);
    if (m) map.set(Number(m[1]), m[2].trim());
  }
  return map;
}

async function fetchCwds(pids: number[]): Promise<Map<number, string>> {
  const out = await run(LSOF, ["-a", "-d", "cwd", "-Fn", "-p", pids.join(",")], { okExitCodes: [0, 1] }).catch(
    () => "",
  );
  const map = new Map<number, string>();
  let pid = 0;
  for (const line of out.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid) map.set(pid, line.slice(1));
  }
  return map;
}

function ancestryOf(pid: number, table: Map<number, PsRow>): { pid: number; name: string }[] {
  const chain: { pid: number; name: string }[] = [];
  const seen = new Set<number>([pid]);
  let current = table.get(pid)?.ppid;
  while (current !== undefined && current > 0 && !seen.has(current)) {
    seen.add(current);
    const row = table.get(current);
    if (!row) break;
    chain.unshift({ pid: current, name: processName(row.comm) });
    current = row.ppid;
  }
  return chain;
}

/**
 * Short name from ps `comm`. Executables report their full path, but servers
 * such as Redis, Postgres and nginx rewrite their process title
 * (`redis-server *:6379`, `postgres: checkpointer`). When the title starts with
 * the kernel's name for the process (from lsof), use that; otherwise keep the
 * first word of retitled names, and plain names with spaces like `Raycast Backend` as-is.
 * Login shells are prefixed with `-` (`-fish`).
 */
export function processName(comm: string, kernelName?: string): string {
  if (comm.startsWith("/")) return path.basename(comm);
  const title = comm.replace(/^-/, "");
  if (kernelName && title.startsWith(kernelName)) return kernelName;
  // Retitled processes whose kernel name differs, e.g. Puma (kernel name `ruby`)
  // shows `puma 6.4.0 (tcp://…) [app]` and Next.js `next-server (v15.1.0)`.
  if (/[:()[\]*]/.test(title)) return title.split(/[\s:]/)[0] || comm;
  return title;
}

function appBundleOf(executable: string): string | undefined {
  const idx = executable.indexOf(".app/");
  return idx >= 0 ? executable.slice(0, idx + 4) : undefined;
}
