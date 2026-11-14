import { ProcessInfo } from "../types";
import { Runner } from "./exec";

/** "[[dd-]hh:]mm:ss" → seconds */
export function parseEtime(s: string): number {
  const [days, rest] = s.includes("-") ? s.split("-") : ["0", s];
  const parts = rest.split(":").map(Number);
  while (parts.length < 3) parts.unshift(0);
  const [h, m, sec] = parts;
  return Number(days) * 86400 + h * 3600 + m * 60 + sec;
}

/** "mmm:ss.cc" or "h:mm:ss" → seconds */
export function parseCpuTime(s: string): number {
  const parts = s.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

/** "/Applications/Microsoft Teams.app/…/MSTeams" → "MSTeams"; a login shell's "-zsh" → "zsh" */
function executableName(comm: string): string {
  return comm.slice(comm.lastIndexOf("/") + 1).replace(/^-/, "");
}

/** Output of `ps -o pid=,ppid=,etime=,time=,user=,comm=`; comm is last because it may contain spaces. */
export function parsePs(text: string): Map<number, ProcessInfo> {
  const info = new Map<number, ProcessInfo>();
  for (const line of text.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    info.set(Number(m[1]), {
      ppid: Number(m[2]),
      etimeSec: parseEtime(m[3]),
      cpuTimeSec: parseCpuTime(m[4]),
      user: m[5],
      command: executableName(m[6]),
      path: m[6],
    });
  }
  return info;
}

const PS_COLUMNS = "pid=,ppid=,etime=,time=,user=,comm=";

/**
 * Looks the pids up with ps. ps exits 1 with no output when none of them exists any more (a blocker's
 * parent script that just ended): that is no rows, not a failed data source.
 */
export async function readProcesses(pids: number[], runner: Runner): Promise<Map<number, ProcessInfo>> {
  try {
    return parsePs(await runner("/bin/ps", ["-o", PS_COLUMNS, "-p", pids.join(",")]));
  } catch (e) {
    const failure = e as { code?: unknown; stdout?: unknown };
    if (failure.code === 1 && !String(failure.stdout ?? "").trim()) return new Map();
    throw e;
  }
}
