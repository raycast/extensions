import { exec } from "../utils/exec";
import { LaunchctlListResult, JobSchedule, JobStatus } from "./types";
import { getLogLastModified } from "./logs";
import { computeNextRun, describeSchedule } from "../utils/schedule";
import os from "os";
import path from "path";

function parseLaunchctlList(
  output: string,
  label: string,
): LaunchctlListResult {
  const result: LaunchctlListResult = {
    label,
    lastExitStatus: 0,
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

async function getLaunchctlInfo(label: string): Promise<LaunchctlListResult> {
  try {
    const output = await exec("/bin/launchctl", ["list", label]);
    return parseLaunchctlList(output, label);
  } catch {
    return {
      label,
      lastExitStatus: 0,
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
    const plist = JSON.parse(output);
    const interval = plist.StartCalendarInterval;
    if (!interval) return [];
    // Handle both single dict and array forms
    return Array.isArray(interval) ? interval : [interval];
  } catch {
    return [];
  }
}

function labelToDisplayName(label: string): string {
  // Strip common prefixes like com.wesbaker.
  const parts = label.split(".");
  const name = parts.length > 2 ? parts.slice(2).join(".") : label;
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

import fs from "fs/promises";

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

  // Determine primary log path for mtime check
  const logPath = info.stdoutPath || info.stderrPath;
  const lastRunTime = logPath ? await getLogLastModified(logPath) : null;

  // LastExitStatus is a waitpid-style status:
  // - If low 7 bits are 0: normal exit, code = (status >> 8) & 0xFF
  // - Otherwise: killed by signal (low 7 bits = signal number)
  const rawExit = info.lastExitStatus;
  const signal = rawExit & 0x7f;
  const exitCode = signal === 0 ? (rawExit >> 8) & 0xff : null;

  return {
    label,
    displayName: labelToDisplayName(label),
    loaded: info.loaded,
    lastExitCode: info.loaded ? exitCode : null,
    signal: info.loaded && signal !== 0 ? signal : null,
    success: info.loaded && lastRunTime ? exitCode === 0 : null,
    lastRunTime,
    nextRunTime:
      schedules.length > 0
        ? schedules.map(computeNextRun).reduce((a, b) => (a < b ? a : b))
        : null,
    scheduleDescription:
      schedules.length > 0 ? schedules.map(describeSchedule).join("; ") : null,
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

export async function kickstartJob(label: string): Promise<void> {
  const uid = process.getuid?.() ?? 501;
  await exec("/bin/launchctl", ["kickstart", `gui/${uid}/${label}`]);
}
