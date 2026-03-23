import { IDLE_CPU_THRESHOLD, IDLE_MEM_KB } from "../constants";
import type {
  GroupMode,
  Process,
  ProcessGroup,
  SortField,
  SortOrder,
  UsageTier,
} from "../types";

export function sortProcesses(
  processes: Process[],
  field: SortField,
  order: SortOrder = "desc",
): Process[] {
  const sorted = [...processes];
  const dir = order === "desc" ? -1 : 1;

  sorted.sort((a, b) => {
    switch (field) {
      case "cpu":
        return (a.cpu - b.cpu) * dir;
      case "mem":
        return (a.rss - b.rss) * dir;
      case "pid":
        return (a.pid - b.pid) * dir;
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "type": {
        const typeOrder = { app: 0, helper: 1, system: 2 };
        return (typeOrder[a.type] - typeOrder[b.type]) * dir;
      }
    }
  });

  return sorted;
}

export function groupProcesses(
  processes: Process[],
  mode: GroupMode,
  cpuThreshold: number,
  memThresholdMb: number,
): ProcessGroup[] {
  switch (mode) {
    case "none":
      return [makeGroup("all", "All Processes", processes)];
    case "type":
      return groupByType(processes);
    case "parent":
      return groupByParent(processes);
    case "usage-tier":
      return groupByUsageTier(processes, cpuThreshold, memThresholdMb);
  }
}

function makeGroup(
  key: string,
  label: string,
  processes: Process[],
): ProcessGroup {
  return {
    key,
    label,
    processes,
    aggregateCpu: processes.reduce((sum, p) => sum + p.cpu, 0),
    aggregateMem: processes.reduce((sum, p) => sum + p.rss, 0),
  };
}

function groupByType(processes: Process[]): ProcessGroup[] {
  const apps = processes.filter((p) => p.type === "app");
  const helpers = processes.filter((p) => p.type === "helper");
  const system = processes.filter((p) => p.type === "system");

  const groups: ProcessGroup[] = [];
  if (apps.length > 0) groups.push(makeGroup("app", "Applications", apps));
  if (helpers.length > 0) groups.push(makeGroup("helper", "Helpers", helpers));
  if (system.length > 0) groups.push(makeGroup("system", "System", system));
  return groups;
}

function groupByParent(processes: Process[]): ProcessGroup[] {
  const byParent = new Map<number, Process[]>();

  for (const proc of processes) {
    const key = proc.ppid;
    const group = byParent.get(key) ?? [];
    group.push(proc);
    byParent.set(key, group);
  }

  const groups: ProcessGroup[] = [];
  for (const [ppid, procs] of byParent) {
    const parent = processes.find((p) => p.pid === ppid);
    const label = parent ? `${parent.name} (${ppid})` : `Parent ${ppid}`;
    groups.push(makeGroup(`parent-${ppid}`, label, procs));
  }

  // Sort by aggregate CPU descending
  groups.sort((a, b) => b.aggregateCpu - a.aggregateCpu);
  return groups;
}

function getUsageTier(
  proc: Process,
  cpuThreshold: number,
  memThresholdMb: number,
): UsageTier {
  const memThresholdKb = memThresholdMb * 1024;
  if (proc.cpu >= cpuThreshold || proc.rss >= memThresholdKb) return "hog";
  if (proc.cpu <= IDLE_CPU_THRESHOLD && proc.rss <= IDLE_MEM_KB) return "idle";
  return "normal";
}

function groupByUsageTier(
  processes: Process[],
  cpuThreshold: number,
  memThresholdMb: number,
): ProcessGroup[] {
  const hogs: Process[] = [];
  const normal: Process[] = [];
  const idle: Process[] = [];

  for (const proc of processes) {
    const tier = getUsageTier(proc, cpuThreshold, memThresholdMb);
    if (tier === "hog") hogs.push(proc);
    else if (tier === "idle") idle.push(proc);
    else normal.push(proc);
  }

  const groups: ProcessGroup[] = [];
  if (hogs.length > 0) groups.push(makeGroup("hog", "Resource Hogs", hogs));
  if (normal.length > 0) groups.push(makeGroup("normal", "Normal", normal));
  if (idle.length > 0) groups.push(makeGroup("idle", "Idle", idle));
  return groups;
}

export function aggregateByApp(processes: Process[]): Process[] {
  const appGroups = new Map<string, Process[]>();
  const nonApp: Process[] = [];

  for (const proc of processes) {
    if (proc.appName) {
      const group = appGroups.get(proc.appName) ?? [];
      group.push(proc);
      appGroups.set(proc.appName, group);
    } else {
      nonApp.push(proc);
    }
  }

  const aggregated: Process[] = [];

  for (const [appName, procs] of appGroups) {
    const main = procs.find((p) => p.type === "app") ?? procs[0];
    aggregated.push({
      ...main,
      appName,
      cpu: procs.reduce((sum, p) => sum + p.cpu, 0),
      rss: procs.reduce((sum, p) => sum + p.rss, 0),
      memPercent: procs.reduce((sum, p) => sum + p.memPercent, 0),
      name: procs.length > 1 ? `${appName} (${procs.length})` : main.name,
    });
  }

  return [...aggregated, ...nonApp];
}
