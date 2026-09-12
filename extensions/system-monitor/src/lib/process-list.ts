import { ProcessDetail, ProcessInfo } from "../Interfaces";
import { execf } from "./exec";

export type ProcessListMode = "cpu" | "memory";

const PROCESS_LIST_COUNT = 20;
const PROCESS_PREVIEW_COUNT = 5;

function formatRss(kilobytes: number): string {
  if (kilobytes >= 1024 * 1024) {
    return `${(kilobytes / (1024 * 1024)).toFixed(1)} GB`;
  }

  if (kilobytes >= 1024) {
    return `${Math.round(kilobytes / 1024)} MB`;
  }

  return `${kilobytes} KB`;
}

function extractProcessName(command: string): string {
  const executable = command.trim().split(/\s+/)[0] ?? command;
  const base = executable.split("/").pop() ?? executable;

  if (base.length > 48) {
    return `${base.slice(0, 45)}…`;
  }

  return base;
}

function parsePsDetailLine(line: string, mode: ProcessListMode): ProcessDetail | null {
  // ps right-aligns numeric columns, so rows with narrow pids carry leading spaces.
  const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
  if (!match) {
    return null;
  }

  const pid = parseInt(match[1], 10);
  const cpuPercent = match[2];
  const memoryPercent = match[3];
  const rss = parseInt(match[4], 10);
  const ppid = parseInt(match[5], 10);
  const user = match[6];
  const elapsed = match[7];
  const command = match[8].trim();
  const memoryRss = formatRss(rss);

  return {
    pid,
    name: extractProcessName(command),
    metric: mode === "cpu" ? `${cpuPercent} %` : memoryRss,
    ppid,
    user,
    elapsed,
    cpuPercent: `${cpuPercent} %`,
    memoryPercent: `${memoryPercent} %`,
    memoryRss,
    command,
  };
}

export async function getProcessList(mode: ProcessListMode, count = PROCESS_LIST_COUNT): Promise<ProcessDetail[]> {
  const sortFlag = mode === "cpu" ? "-r" : "-m";
  const output = await execf("/bin/ps", ["-axo", "pid=,pcpu=,pmem=,rss=,ppid=,user=,etime=,command=", sortFlag]);

  return output
    .trim()
    .split("\n")
    .slice(0, count)
    .map((line) => parsePsDetailLine(line, mode))
    .filter((process): process is ProcessDetail => process !== null);
}

export async function getTopProcesses(mode: ProcessListMode, count = PROCESS_PREVIEW_COUNT): Promise<ProcessInfo[]> {
  return getProcessList(mode, count);
}

export const PROCESS_LIST_POLL_MS = 3_000;
