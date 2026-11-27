import { execFile } from "child_process";
import { promisify } from "util";
import {
  BrowserType,
  BundleCategory,
  ChildProcessInfo,
  ProcessBundle,
  RawProcess,
} from "../types";
import { classifyProcess } from "./classifier";

const execFileAsync = promisify(execFile);

function detectBrowserType(
  bundleName: string,
  command: string,
): BrowserType | undefined {
  const lowerName = bundleName.toLowerCase();
  const lowerCmd = command.toLowerCase();

  if (lowerName.includes("firefox") || lowerCmd.includes("firefox")) {
    return "firefox";
  }
  if (
    lowerName.includes("google chrome") ||
    lowerCmd.includes("google chrome")
  ) {
    return "chrome";
  }
  if (lowerName.includes("brave browser") || lowerCmd.includes("brave")) {
    return "brave";
  }
  if (lowerName.includes("microsoft edge") || lowerCmd.includes("msedge")) {
    return "edge";
  }
  if (lowerName.includes("arc") || lowerCmd.includes("/arc.app/")) {
    return "arc";
  }
  if (lowerName.includes("safari") || lowerCmd.includes("/safari.app/")) {
    return "safari";
  }
  return undefined;
}

function detectCategory(
  bundleName: string,
  command: string,
  browserType?: BrowserType,
): BundleCategory {
  if (browserType) {
    return "browser";
  }
  const lower = `${bundleName} ${command}`.toLowerCase();
  if (
    lower.includes("code") ||
    lower.includes("cursor") ||
    lower.includes("windsurf") ||
    lower.includes("xcode") ||
    lower.includes("iterm") ||
    lower.includes("terminal") ||
    lower.includes("git") ||
    lower.includes("node") ||
    lower.includes("python") ||
    lower.includes("rust") ||
    lower.includes("cargo") ||
    lower.includes("docker")
  ) {
    return "developer";
  }
  if (
    lower.includes("windowserver") ||
    lower.includes("/mds") ||
    lower.includes("mdworker") ||
    lower.includes("kernel_task") ||
    lower.includes("launchd") ||
    lower.includes("coreaudio") ||
    lower.includes("bluetoothd") ||
    lower.includes("system/library")
  ) {
    return "system";
  }
  if (
    lower.includes("spotify") ||
    lower.includes("music") ||
    lower.includes("vlc") ||
    lower.includes("quicktime")
  ) {
    return "multimedia";
  }
  return "general";
}

function extractAppBundlePath(command: string): {
  bundlePath?: string;
  bundleName?: string;
} {
  const match = command.match(
    /(\/(?:Applications|System\/Applications|Users\/[^/]+\/Applications)\/[^/]+\.app)/,
  );
  if (match) {
    const bundlePath = match[1];
    const rawName =
      bundlePath
        .split("/")
        .pop()
        ?.replace(/\.app$/, "") || "App";
    return { bundlePath, bundleName: rawName };
  }

  const genericAppMatch = command.match(/(\/[^:\n\t]+\.app)/);
  if (genericAppMatch) {
    const bundlePath = genericAppMatch[1];
    const rawName =
      bundlePath
        .split("/")
        .pop()
        ?.replace(/\.app$/, "") || "App";
    return { bundlePath, bundleName: rawName };
  }

  return {};
}

function getBaseCommandName(command: string): string {
  const firstToken = command.trim().split(/\s+/)[0] || "process";
  const binary = firstToken.split("/").pop() || firstToken;
  return binary.replace(/[^a-zA-Z0-9_.-]/g, "");
}

export async function snapshotProcesses(): Promise<ProcessBundle[]> {
  const { stdout } = await execFileAsync("ps", [
    "-axo",
    "pid,ppid,%cpu,rss,command",
  ]);
  const lines = stdout.split("\n");

  const rawProcesses: RawProcess[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/);
    if (!match) {
      continue;
    }
    rawProcesses.push({
      pid: parseInt(match[1], 10),
      ppid: parseInt(match[2], 10),
      cpu: parseFloat(match[3]),
      rssKb: parseInt(match[4], 10),
      command: match[5],
    });
  }

  const pidMap = new Map<number, RawProcess>();
  for (const proc of rawProcesses) {
    pidMap.set(proc.pid, proc);
  }

  interface ProcessMeta {
    proc: RawProcess;
    bundleKey: string;
    bundleName: string;
    bundlePath?: string;
    isMain: boolean;
  }

  const resolved = new Map<number, ProcessMeta>();

  for (const proc of rawProcesses) {
    const { bundlePath, bundleName } = extractAppBundlePath(proc.command);
    if (bundlePath && bundleName) {
      const isMainBinary =
        proc.command.includes(`${bundlePath}/Contents/MacOS/`) &&
        !proc.command.includes("Helper") &&
        !proc.command.includes("plugin-container") &&
        !proc.command.includes("gpu-helper");
      resolved.set(proc.pid, {
        proc,
        bundleKey: bundlePath,
        bundleName,
        bundlePath,
        isMain: isMainBinary,
      });
    }
  }

  for (const proc of rawProcesses) {
    if (resolved.has(proc.pid)) {
      continue;
    }

    let currentPpid = proc.ppid;
    let ancestorMeta: ProcessMeta | undefined;
    const visited = new Set<number>();

    while (currentPpid > 1 && !visited.has(currentPpid)) {
      visited.add(currentPpid);
      if (resolved.has(currentPpid)) {
        ancestorMeta = resolved.get(currentPpid);
        break;
      }
      const parent = pidMap.get(currentPpid);
      if (!parent) {
        break;
      }
      currentPpid = parent.ppid;
    }

    if (ancestorMeta) {
      resolved.set(proc.pid, {
        proc,
        bundleKey: ancestorMeta.bundleKey,
        bundleName: ancestorMeta.bundleName,
        bundlePath: ancestorMeta.bundlePath,
        isMain: false,
      });
    } else {
      const baseName = getBaseCommandName(proc.command);
      resolved.set(proc.pid, {
        proc,
        bundleKey: baseName,
        bundleName: baseName,
        isMain: true,
      });
    }
  }

  const bundlesMap = new Map<
    string,
    {
      bundleKey: string;
      bundleName: string;
      bundlePath?: string;
      processes: RawProcess[];
      mainProc?: RawProcess;
    }
  >();

  for (const item of resolved.values()) {
    let group = bundlesMap.get(item.bundleKey);
    if (!group) {
      group = {
        bundleKey: item.bundleKey,
        bundleName: item.bundleName,
        bundlePath: item.bundlePath,
        processes: [],
      };
      bundlesMap.set(item.bundleKey, group);
    }
    group.processes.push(item.proc);
    if (item.isMain && !group.mainProc) {
      group.mainProc = item.proc;
    }
  }

  const bundles: ProcessBundle[] = [];

  for (const group of bundlesMap.values()) {
    let totalCpu = 0;
    let totalRssKb = 0;
    for (const p of group.processes) {
      totalCpu += p.cpu;
      totalRssKb += p.rssKb;
    }

    const mainProc = group.mainProc || group.processes[0];
    const browserType = detectBrowserType(group.bundleName, mainProc.command);
    const category = detectCategory(
      group.bundleName,
      mainProc.command,
      browserType,
    );

    const children: ChildProcessInfo[] = group.processes.map((p) => {
      const isMain = p.pid === mainProc.pid;
      const label = isMain
        ? "Main Application Process"
        : classifyProcess(p.command, group.bundleName);
      return {
        pid: p.pid,
        ppid: p.ppid,
        cpu: p.cpu,
        rssBytes: p.rssKb * 1024,
        command: p.command,
        functionalLabel: label,
        isHot: p.cpu >= 15.0,
      };
    });

    children.sort((a, b) => b.cpu - a.cpu || b.rssBytes - a.rssBytes);

    let hotWorker: ChildProcessInfo | undefined;
    const nonMainWorkers = children.filter((c) => c.pid !== mainProc.pid);
    if (nonMainWorkers.length > 0) {
      hotWorker = nonMainWorkers[0];
    } else if (children.length > 0) {
      hotWorker = children[0];
    }

    bundles.push({
      id: group.bundleKey,
      name: group.bundleName,
      bundlePath: group.bundlePath,
      category,
      browserType,
      mainPid: mainProc.pid,
      totalCpu: parseFloat(totalCpu.toFixed(1)),
      totalRssBytes: totalRssKb * 1024,
      processCount: group.processes.length,
      hotWorker,
      children,
    });
  }

  return bundles;
}
