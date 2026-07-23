import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import { isProtectedProcessPath } from "./custom-process-rule-logic.ts";
import type { CustomProcessRule, CustomRuleMatches, RunningApplication, RunningProcess } from "../types.ts";

const execFileAsync = promisify(execFile);

export interface ProcessActionResult {
  accepted: boolean;
  executablePath: string;
  pid: number;
  status: "already-terminated" | "identity-mismatch" | "protected" | "requested" | "rejected";
}

export async function listRunningProcesses(): Promise<RunningProcess[]> {
  const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,comm="], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 10_000,
  });

  return parseProcessList(stdout);
}

export function parseProcessList(output: string): RunningProcess[] {
  const processes: RunningProcess[] = [];

  for (const line of output.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);

    if (!match) {
      continue;
    }

    const pid = Number(match[1]);
    const executablePath = match[2];

    if (!Number.isSafeInteger(pid) || pid <= 0 || !executablePath.startsWith("/")) {
      continue;
    }

    processes.push({
      executablePath,
      name: basename(executablePath),
      pid,
    });
  }

  return processes;
}

export function matchCustomRulesToRunningTargets(
  rules: CustomProcessRule[],
  applications: RunningApplication[],
  processes: RunningProcess[],
): CustomRuleMatches {
  const applicationMatches = new Map<string, CustomRuleMatches["applications"][number]>();
  const processMatches = new Map<string, CustomRuleMatches["processes"][number]>();
  const matchedApplicationPids = new Set<number>();

  for (const rule of rules) {
    for (const application of applications) {
      if (application.path !== rule.path && application.executablePath !== rule.path) {
        continue;
      }

      const key = applicationIdentityKey(application);
      const existing = applicationMatches.get(key);
      applicationMatches.set(key, {
        application,
        forceAfterTimeout: Boolean(existing?.forceAfterTimeout || rule.forceAfterTimeout),
      });
      matchedApplicationPids.add(application.pid);
    }
  }

  for (const rule of rules) {
    for (const runningProcess of processes) {
      if (
        runningProcess.executablePath !== rule.path ||
        matchedApplicationPids.has(runningProcess.pid) ||
        runningProcess.pid === process.pid ||
        runningProcess.pid === process.ppid ||
        runningProcess.pid <= 1 ||
        isProtectedProcessPath(runningProcess.executablePath)
      ) {
        continue;
      }

      const key = processIdentityKey(runningProcess);
      const existing = processMatches.get(key);
      processMatches.set(key, {
        forceAfterTimeout: Boolean(existing?.forceAfterTimeout || rule.forceAfterTimeout),
        process: {
          ...runningProcess,
          name: rule.name,
        },
      });
    }
  }

  return {
    applications: [...applicationMatches.values()],
    processes: [...processMatches.values()],
  };
}

export function keepProcessesStillRunning(original: RunningProcess[], current: RunningProcess[]): RunningProcess[] {
  const identities = new Set(current.map((runningProcess) => processIdentityKey(runningProcess)));
  return original.filter((runningProcess) => identities.has(processIdentityKey(runningProcess)));
}

export async function requestProcessTermination(
  targets: RunningProcess[],
  force: boolean,
): Promise<ProcessActionResult[]> {
  if (targets.length === 0) {
    return [];
  }

  const currentProcesses = await listRunningProcesses();
  const currentByPid = new Map(currentProcesses.map((runningProcess) => [runningProcess.pid, runningProcess]));
  const signal: NodeJS.Signals = force ? "SIGKILL" : "SIGTERM";
  const results: ProcessActionResult[] = [];

  for (const target of targets) {
    const current = currentByPid.get(target.pid);

    if (!current) {
      results.push({ ...target, accepted: true, status: "already-terminated" });
      continue;
    }

    if (current.executablePath !== target.executablePath) {
      results.push({ ...target, accepted: false, status: "identity-mismatch" });
      continue;
    }

    if (
      target.pid <= 1 ||
      target.pid === process.pid ||
      target.pid === process.ppid ||
      isProtectedProcessPath(target.executablePath)
    ) {
      results.push({ ...target, accepted: false, status: "protected" });
      continue;
    }

    try {
      process.kill(target.pid, signal);
      results.push({ ...target, accepted: true, status: "requested" });
    } catch {
      results.push({ ...target, accepted: false, status: "rejected" });
    }
  }

  return results;
}

function applicationIdentityKey(application: RunningApplication): string {
  return `${application.pid}:${application.bundleId}`;
}

function processIdentityKey(runningProcess: RunningProcess): string {
  return `${runningProcess.pid}:${runningProcess.executablePath}`;
}
