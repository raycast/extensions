import fs from "fs/promises";
import os from "os";
import path from "path";
import { exec } from "../utils/exec";
import { LaunchctlListResult, JobSchedule, JobStatus } from "./types";
import { getLogLastModified } from "./logs";
import { computeNextRun, describeSchedules } from "../utils/schedule";

export function parseLaunchctlList(
  output: string,
  label: string,
): LaunchctlListResult {
  const result: LaunchctlListResult = {
    label,
    lastExitStatus: null,
    pid: null,
    stdoutPath: null,
    stderrPath: null,
    program: null,
    loaded: true,
  };

  for (const line of output.split("\n")) {
    const match = line.match(/^\s*"(\w+)"\s*=\s*(.+);$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^"|"$/g, "");

    switch (key) {
      case "LastExitStatus":
        result.lastExitStatus = parseInt(value, 10);
        break;
      case "PID":
        result.pid = parseInt(value, 10);
        break;
      case "StandardOutPath":
        result.stdoutPath = value;
        break;
      case "StandardErrorPath":
        result.stderrPath = value;
        break;
      case "Program":
        result.program = value;
        break;
    }
  }

  return result;
}

/**
 * Decode a waitpid-style status word as reported by launchctl.
 *
 * - If the low 7 bits are zero, the process exited normally; the exit code is in
 *   the next 8 bits.
 * - Otherwise the process was killed by a signal (low 7 bits = signal number).
 */
export function decodeExitStatus(raw: number | null): {
  exitCode: number | null;
  signal: number | null;
} {
  if (raw === null) return { exitCode: null, signal: null };
  const sig = raw & 0x7f;
  if (sig !== 0) return { exitCode: null, signal: sig };
  return { exitCode: (raw >> 8) & 0xff, signal: null };
}

export function labelToDisplayName(label: string): string {
  const parts = label.split(".");
  const segment = parts[parts.length - 1] || label;
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isDaemonPlistPath(plistPath: string | null): boolean {
  return plistPath?.startsWith("/Library/LaunchDaemons") ?? false;
}

export function parseScheduleFromPlist(
  plist: Record<string, unknown>,
): JobSchedule[] {
  const schedules: JobSchedule[] = [];

  const interval = plist.StartInterval;
  if (typeof interval === "number" && interval > 0) {
    schedules.push({ type: "interval", seconds: interval });
  }

  const calendar = plist.StartCalendarInterval;
  if (calendar) {
    const entries = Array.isArray(calendar) ? calendar : [calendar];
    for (const entry of entries) {
      if (entry && typeof entry === "object") {
        schedules.push({ type: "calendar", ...entry });
      }
    }
  }

  return schedules;
}

async function getLaunchctlInfo(label: string): Promise<LaunchctlListResult> {
  try {
    const output = await exec("/bin/launchctl", ["list", label]);
    return parseLaunchctlList(output, label);
  } catch {
    return {
      label,
      lastExitStatus: null,
      pid: null,
      stdoutPath: null,
      stderrPath: null,
      program: null,
      loaded: false,
    };
  }
}

async function getPlistSchedules(plistPath: string): Promise<JobSchedule[]> {
  try {
    const output = await exec("/usr/bin/plutil", [
      "-convert",
      "json",
      "-o",
      "-",
      plistPath,
    ]);
    return parseScheduleFromPlist(JSON.parse(output));
  } catch {
    return [];
  }
}

async function plistPathForLabel(label: string): Promise<string | null> {
  const searchPaths = [
    path.join(os.homedir(), "Library", "LaunchAgents"),
    "/Library/LaunchAgents",
    "/Library/LaunchDaemons",
  ];
  for (const dir of searchPaths) {
    const candidate = path.join(dir, `${label}.plist`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export async function getJobStatus(label: string): Promise<JobStatus> {
  const plistPath = await plistPathForLabel(label);
  const [info, schedules] = await Promise.all([
    getLaunchctlInfo(label),
    plistPath ? getPlistSchedules(plistPath) : Promise.resolve([]),
  ]);

  // Use the most recent mtime from stdout/stderr
  const mtimes = await Promise.all(
    [info.stdoutPath, info.stderrPath]
      .filter((p): p is string => p !== null)
      .map((p) => getLogLastModified(p)),
  );
  const lastRunTime =
    mtimes
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const { exitCode, signal } = decodeExitStatus(info.lastExitStatus);
  const running = info.loaded && info.pid !== null && info.pid > 0;

  // Success is decoupled from log-mtime: a recorded LastExitStatus is the
  // ground truth. Jobs without log files but with a recorded exit are still
  // classified correctly.
  const success: boolean | null = !info.loaded
    ? null
    : running
      ? null
      : info.lastExitStatus === null
        ? null
        : signal !== null
          ? false
          : exitCode === 0;

  const nextRunTime =
    schedules.length > 0
      ? schedules
          .map((s) => computeNextRun(s, lastRunTime))
          .reduce((a, b) => (a < b ? a : b))
      : null;

  return {
    label,
    displayName: labelToDisplayName(label),
    loaded: info.loaded,
    running,
    pid: info.pid,
    lastExitCode: info.loaded ? exitCode : null,
    signal: info.loaded ? signal : null,
    success,
    lastRunTime,
    nextRunTime,
    scheduleDescription:
      schedules.length > 0 ? describeSchedules(schedules) : null,
    stdoutPath: info.stdoutPath,
    stderrPath: info.stderrPath,
    program: info.program,
    plistPath,
  };
}

export async function getAllJobStatuses(
  labels: string[],
): Promise<JobStatus[]> {
  return Promise.all(labels.map(getJobStatus));
}

export class KickstartCancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "KickstartCancelledError";
  }
}

function escapeAppleScriptString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function kickstartJob(
  label: string,
  plistPath: string | null,
): Promise<void> {
  if (isDaemonPlistPath(plistPath)) {
    const target = `system/${label}`;
    const script = `do shell script "/bin/launchctl kickstart ${escapeAppleScriptString(target)}" with administrator privileges`;
    try {
      await exec("/usr/bin/osascript", ["-e", script]);
    } catch (e) {
      const err = e as Error & { stderr?: string };
      const haystack = `${err.message ?? ""}\n${err.stderr ?? ""}`;
      if (haystack.includes("User canceled") || haystack.includes("(-128)")) {
        throw new KickstartCancelledError();
      }
      throw e;
    }
    return;
  }

  const uid = process.getuid?.() ?? os.userInfo().uid;
  await exec("/bin/launchctl", ["kickstart", `gui/${uid}/${label}`]);
}
