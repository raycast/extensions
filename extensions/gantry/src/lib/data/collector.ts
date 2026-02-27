import { readdir } from "fs/promises";
import { join } from "path";
import type { LaunchJob, LaunchctlListEntry, JobHealth } from "../types";
import { PLIST_DIRS } from "../constants";
import { listServices } from "./launchctl";
import { parsePlist } from "./plist-parser";
import { interpretExitCode } from "../utils/signal-names";
import { extractProgramName } from "../utils/format";
import { computeSchedule } from "../schedule/index";

export function determineHealth(
  exitCode: number | null,
  isRunning: boolean,
): JobHealth {
  if (isRunning) return "healthy";
  if (exitCode === null) return "unknown";
  if (exitCode === 0) return "healthy";
  if (exitCode < 0) {
    const signalNum = Math.abs(exitCode);
    if (signalNum === 9 || signalNum === 15) return "warning";
    return "error";
  }
  return "error";
}

/**
 * Collects all launch jobs by scanning plist directories and matching with live status.
 */
export async function collectJobs(): Promise<LaunchJob[]> {
  const liveEntries = await listServices();
  const liveMap = new Map<string, LaunchctlListEntry>();
  for (const entry of liveEntries) {
    liveMap.set(entry.label, entry);
  }

  const jobs: LaunchJob[] = [];

  for (const { dir, source } of PLIST_DIRS) {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }

    const plistFiles = files.filter((f) => f.endsWith(".plist"));

    const parseResults = await Promise.allSettled(
      plistFiles.map(async (filename) => {
        const plistPath = join(dir, filename);
        const config = await parsePlist(plistPath);
        return { plistPath, config, source };
      }),
    );

    for (const result of parseResults) {
      if (result.status !== "fulfilled") continue;

      const { plistPath, config, source: jobSource } = result.value;
      const label = config.Label;

      if (!label) continue;

      const liveEntry = liveMap.get(label);
      const isRunning = liveEntry?.pid != null;
      const pid = liveEntry?.pid ?? null;
      const lastExitCode = liveEntry?.exitCode ?? null;

      const health = determineHealth(lastExitCode, isRunning);
      const schedule = await computeSchedule(config);
      const programShort = extractProgramName(config);
      const programFull =
        config.ProgramArguments?.[0] ?? config.Program ?? label ?? "unknown";

      jobs.push({
        label,
        source: jobSource,
        plistPath,
        isRunning,
        pid,
        lastExitCode,
        exitCodeMeaning: interpretExitCode(lastExitCode),
        runs: 0,
        health,
        schedule,
        program: programShort,
        programFull,
        logPaths: {
          stdout: config.StandardOutPath,
          stderr: config.StandardErrorPath,
        },
        config,
      });

      liveMap.delete(label);
    }
  }

  const deduped = new Map<string, LaunchJob>();
  for (const job of jobs) {
    const existing = deduped.get(job.label);
    if (!existing) {
      deduped.set(job.label, job);
      continue;
    }
    const prefer =
      job.isRunning && !existing.isRunning
        ? job
        : !job.isRunning && existing.isRunning
          ? existing
          : job.lastExitCode !== null && existing.lastExitCode === null
            ? job
            : existing;
    deduped.set(job.label, prefer);
  }

  const result = Array.from(deduped.values());
  result.sort((a, b) => a.label.localeCompare(b.label));

  return result;
}
