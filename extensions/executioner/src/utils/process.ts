import { execSync } from "child_process";
import { PS_COMMAND } from "../constants";
import type { Process, ProcessType } from "../types";

export function fetchProcesses(): Process[] {
  const output = execSync(PS_COMMAND, {
    maxBuffer: 10 * 1024 * 1024,
  }).toString();
  const lines = output.split("\n").slice(1); // skip header
  const processes: Process[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed && parsed.name && parsed.pid !== 0) {
      processes.push(parsed);
    }
  }

  return processes;
}

function parseLine(line: string): Process | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // pid ppid %cpu %mem rss etime ni comm
  const match = trimmed.match(
    /^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(-?\d+)\s+(.+)$/,
  );
  if (!match) return null;

  const [, pidStr, ppidStr, cpuStr, memStr, rssStr, elapsed, niceStr, comm] =
    match;
  const pid = parseInt(pidStr);
  const ppid = parseInt(ppidStr);
  const cpu = parseFloat(cpuStr);
  const memPercent = parseFloat(memStr);
  const rss = parseInt(rssStr);
  const nice = parseInt(niceStr);
  const name = comm.match(/[^/]*$/)?.[0] ?? comm;
  const type = classifyProcess(comm);
  const appName = resolveAppName(comm, type);

  return {
    pid,
    ppid,
    cpu,
    memPercent,
    rss,
    elapsed,
    nice,
    comm,
    name,
    type,
    appName,
  };
}

function classifyProcess(comm: string): ProcessType {
  if (comm.includes(".app/Contents/")) {
    // Check if it's the main app binary or a helper
    const appMatch = comm.match(/^(.+?\.app)\/Contents\/MacOS\/([^/]+)$/);
    if (appMatch) {
      const appBundleName = appMatch[1].match(/([^/]+)\.app$/)?.[1];
      const binaryName = appMatch[2];
      if (appBundleName === binaryName) return "app";
    }
    return "helper";
  }
  if (comm.startsWith("/Applications/")) return "app";
  return "system";
}

function resolveAppName(comm: string, type: ProcessType): string | undefined {
  if (type === "app" || type === "helper") {
    return comm.match(/(?<=\/)[^/]+(?=\.app\/)/)?.[0];
  }
  return undefined;
}

export function getProcessIcon(proc: Process): { fileIcon: string } | string {
  if (proc.type === "app") {
    const appPath = proc.comm.replace(/(.+\.app)(.+)/, "$1");
    return { fileIcon: appPath };
  }
  if (proc.type === "helper" && proc.appName) {
    const appPath = proc.comm.replace(/(.+\.app)(.+)/, "$1");
    return { fileIcon: appPath };
  }
  return "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ExecutableBinaryIcon.icns";
}

export function findDuplicates(processes: Process[]): Map<string, Process[]> {
  const groups = new Map<string, Process[]>();
  for (const proc of processes) {
    const existing = groups.get(proc.name) ?? [];
    existing.push(proc);
    groups.set(proc.name, existing);
  }
  // Only return groups with more than one process
  const dupes = new Map<string, Process[]>();
  for (const [name, procs] of groups) {
    if (procs.length > 1) dupes.set(name, procs);
  }
  return dupes;
}
