import { Action, ActionPanel, Detail, getPreferenceValues, open } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useState } from "react";
import { DAILY_SCHEDULE_LABEL, getSchedulePaths } from "./run-utils";

const execFileAsync = promisify(execFile);

type LastRunStatus = {
  mode?: string;
  date?: string;
  status?: string;
  reason?: string;
  exit_code?: string | number;
  started_at?: string;
  finished_at?: string;
  log_path?: string;
};

type StatusData = {
  schedulePaths: ReturnType<typeof getSchedulePaths>;
  plistExists: boolean;
  launchAgentLoaded: boolean;
  installed: boolean;
  lastRun: LastRunStatus | undefined;
  lastSuccessDate: string | undefined;
  todaySummary: string;
};

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readLastRunStatus(statusPath: string): LastRunStatus | undefined {
  if (!fs.existsSync(statusPath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(statusPath, "utf-8")) as LastRunStatus;
  } catch {
    return undefined;
  }
}

function readLastSuccessDate(lastSuccessPath: string): string | undefined {
  if (!fs.existsSync(lastSuccessPath)) {
    return undefined;
  }
  const value = fs.readFileSync(lastSuccessPath, "utf-8").trim();
  return value || undefined;
}

async function isLaunchAgentLoaded(label: string): Promise<boolean> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    return false;
  }
  try {
    await execFileAsync("/bin/launchctl", ["print", `gui/${uid}/${label}`]);
    return true;
  } catch {
    return false;
  }
}

function formatReason(reason: string | undefined): string {
  if (!reason) return "None";
  return reason.replace(/-/g, " ");
}

/** Date (YYYY-MM-DD) when the run finished; falls back to lastRun.date for old status files. */
function runFinishDate(lastRun: LastRunStatus | undefined): string | undefined {
  if (!lastRun) return undefined;
  const finished = lastRun.finished_at?.trim();
  if (finished && /^\d{4}-\d{2}-\d{2}/.test(finished)) {
    return finished.slice(0, 10);
  }
  return lastRun.date;
}

/** If both started_at and finished_at are valid, return approximate duration in hours; else undefined. */
function runDurationHours(lastRun: LastRunStatus | undefined): number | undefined {
  const started = lastRun?.started_at?.trim();
  const finished = lastRun?.finished_at?.trim();
  if (!started || !finished) return undefined;
  const startMs = new Date(started.replace(" ", "T")).getTime();
  const finishMs = new Date(finished.replace(" ", "T")).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(finishMs) || finishMs < startMs) return undefined;
  return (finishMs - startMs) / (1000 * 60 * 60);
}

function computeTodaySummary(lastSuccessDate: string | undefined, lastRun: LastRunStatus | undefined): string {
  const today = todayDateString();
  const runDate = runFinishDate(lastRun);
  if (lastRun && runDate === today) {
    if (lastRun.status === "success") return "Success";
    if (lastRun.status === "failed") return "Failed";
    if (lastRun.status === "skipped") return `Skipped (${formatReason(lastRun.reason)})`;
    return lastRun.status ?? "Unknown";
  }
  if (lastSuccessDate === today) {
    return "Success";
  }
  return "Not run yet";
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.CheckRunStatus>();
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      const schedulePaths = getSchedulePaths();
      const plistExists = fs.existsSync(schedulePaths.plistPath);
      const launchAgentLoaded = await isLaunchAgentLoaded(DAILY_SCHEDULE_LABEL);
      const installed = launchAgentLoaded;
      const lastRun = readLastRunStatus(schedulePaths.statusPath);
      const lastSuccessDate = readLastSuccessDate(schedulePaths.lastSuccessPath);
      const todaySummary = computeTodaySummary(lastSuccessDate, lastRun);

      if (cancelled) {
        return;
      }

      setStatus({
        schedulePaths,
        plistExists,
        launchAgentLoaded,
        installed,
        lastRun,
        lastSuccessDate,
        todaySummary,
      });
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return <Detail isLoading={true} markdown="Loading run status..." navigationTitle="Run Status" />;
  }

  const { schedulePaths, plistExists, launchAgentLoaded, installed, lastRun, lastSuccessDate, todaySummary } = status;
  const configPath = prefs.configPath?.trim() ?? "";
  const configDir = configPath ? path.dirname(configPath) : "";
  const lastRunDate = runFinishDate(lastRun);
  const durationHours = runDurationHours(lastRun);
  const durationNote =
    durationHours !== undefined && durationHours >= 24 ? ` _(run took ${Math.round(durationHours)} hours)_` : "";

  const markdown = [
    "# Run Status",
    "",
    "Status applies to both **scheduled** (daily 04:00) and **manual** (Run Paper Agent) runs; they share the same state and last-run record.",
    "",
    "## Schedule",
    "",
    `- Installed: ${installed ? "Yes" : "No"}`,
    `- LaunchAgent plist present: ${plistExists ? "Yes" : "No"}`,
    `- Loaded in launchd: ${launchAgentLoaded ? "Yes" : "No"}`,
    `- Scheduled time: 04:00 local time`,
    `- Today's result: ${todaySummary}`,
    `- Last successful day: ${lastSuccessDate ?? "Never"}`,
    "",
    "_The 04:00 run is skipped if today already succeeded, another run is still in progress, or the agent root path is not available (e.g. external disk not mounted)._",
    "",
    "## Last Run (scheduled or manual)",
    "",
    `- Status: ${lastRun?.status ?? "Unknown"}`,
    `- Mode: ${lastRun?.mode ?? "Unknown"}`,
    `- Date: ${lastRunDate ?? "Unknown"} _(finish date)_`,
    `- Reason: ${formatReason(lastRun?.reason)}`,
    `- Exit code: ${lastRun?.exit_code ?? "Unknown"}`,
    `- Started at: ${lastRun?.started_at ?? "Unknown"}`,
    `- Finished at: ${lastRun?.finished_at ?? "Unknown"}${durationNote}`,
    `- Log path: ${lastRun?.log_path ?? schedulePaths.logDir}`,
    "",
    "## Paths",
    "",
    `- LaunchAgent plist: ${schedulePaths.plistPath}`,
    `- State directory: ${schedulePaths.stateDir}`,
    `- Log directory: ${schedulePaths.logDir}`,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Run Status"
      actions={
        <ActionPanel>
          {configDir ? <Action title="Open Config Directory" onAction={() => open(configDir)} /> : null}
          <Action title="Open Log Directory" onAction={() => open(schedulePaths.logDir)} />
          {lastRun?.log_path ? (
            <Action title="Open Last Run Log" onAction={() => open(lastRun.log_path as string)} />
          ) : null}
          <Action title="Open State Directory" onAction={() => open(schedulePaths.stateDir)} />
        </ActionPanel>
      }
    />
  );
}
