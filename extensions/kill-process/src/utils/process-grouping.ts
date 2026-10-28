import { Process } from "../types";
import { isWindows } from "./platform";

function getOuterAppBundlePath(path: string): string | undefined {
  return path.match(/^(.+?\.app)(?:\/|$)/)?.[1];
}

/**
 * Windows has no app bundle to group by, and the executable alone is not enough:
 * unrelated node.exe or cmd.exe instances would merge into one entry. A group is
 * a process plus the descendants running the same executable, so the key is the
 * topmost ancestor still running it.
 */
export function createWindowsGroupKeyResolver(processes: Process[]): (process: Process) => string | undefined {
  const processesById = new Map(processes.map((process) => [process.id, process]));

  return (process) => {
    if (!process.path) {
      return undefined;
    }

    const executable = process.path.toLowerCase();
    const visited = new Set([process.id]);
    let root = process;

    for (;;) {
      const parent = processesById.get(root.pid);
      if (!parent || visited.has(parent.id) || parent.path.toLowerCase() !== executable) {
        return `${executable}#${root.id}`;
      }

      visited.add(parent.id);
      root = parent;
    }
  };
}

function createGroupKeyResolver(processes: Process[]): (process: Process) => string | undefined {
  const resolveWindowsGroupKey = createWindowsGroupKeyResolver(processes);

  return (process) => getOuterAppBundlePath(process.path) ?? (isWindows ? resolveWindowsGroupKey(process) : undefined);
}

function getAppNameFromBundlePath(bundlePath: string, processes: Process[]): string {
  if (isWindows) {
    return processes[0].processName;
  }
  return bundlePath.match(/([^/]+)\.app$/)?.[1] ?? bundlePath;
}

function findMainProcess(processes: Process[], appName: string): Process {
  const processIds = new Set(processes.map((process) => process.id));
  const rootProcess = processes.find((process) => !processIds.has(process.pid));
  if (isWindows) {
    return rootProcess ?? processes[0];
  }
  return processes.find((process) => process.processName === appName) ?? rootProcess ?? processes[0];
}

function aggregateAppProcesses(bundlePath: string, processes: Process[]): Process {
  const appName = getAppNameFromBundlePath(bundlePath, processes);
  const mainProcess = findMainProcess(processes, appName);
  const childProcesses = processes.filter((process) => process.id !== mainProcess.id);

  return {
    ...mainProcess,
    cpu: processes.reduce((total, process) => total + process.cpu, 0),
    mem: processes.reduce((total, process) => total + process.mem, 0),
    type: "aggregatedApp",
    path: mainProcess.path || bundlePath,
    processName: mainProcess.processName || appName,
    appName,
    childProcessCount: childProcesses.length,
    childProcessIds: childProcesses.map((process) => process.id),
  };
}

export function groupRelatedProcesses(processes: Process[]): Process[] {
  const appGroups = new Map<string, Process[]>();
  const ungroupedProcesses: Process[] = [];
  const getGroupKey = createGroupKeyResolver(processes);

  for (const process of processes) {
    const bundlePath = getGroupKey(process);
    if (!bundlePath) {
      ungroupedProcesses.push(process);
      continue;
    }

    const group = appGroups.get(bundlePath);
    if (group) {
      group.push(process);
    } else {
      appGroups.set(bundlePath, [process]);
    }
  }

  appGroups.forEach((group, bundlePath) => {
    ungroupedProcesses.push(group.length > 1 ? aggregateAppProcesses(bundlePath, group) : group[0]);
  });

  return ungroupedProcesses;
}
