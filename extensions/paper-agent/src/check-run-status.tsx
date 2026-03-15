import { Action, ActionPanel, Detail, getPreferenceValues, open } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";
import { getSchedulePaths } from "./run-utils";

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

function formatReason(reason: string | undefined): string {
  if (!reason) return "None";
  return reason.replace(/-/g, " ");
}

function computeTodaySummary(lastSuccessDate: string | undefined, lastRun: LastRunStatus | undefined): string {
  const today = todayDateString();
  // Prefer the most recent run for today so summary matches "Last Run" (e.g. scheduled success then manual fail → show Failed).
  if (lastRun?.date === today) {
    if (lastRun.status === "success") return "Success";
    if (lastRun.status === "failed") return "Failed";
    if (lastRun.status === "skipped") return `Skipped (${formatReason(lastRun.reason)})`;
    // Unknown or other status: show it instead of falling through to lastSuccessDate.
    return lastRun.status ?? "Unknown";
  }
  if (lastSuccessDate === today) {
    return "Success";
  }
  return "Not run yet";
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.CheckRunStatus>();
  const schedulePaths = getSchedulePaths();
  const installed = fs.existsSync(schedulePaths.plistPath);
  const lastRun = readLastRunStatus(schedulePaths.statusPath);
  const lastSuccessDate = readLastSuccessDate(schedulePaths.lastSuccessPath);
  const todaySummary = computeTodaySummary(lastSuccessDate, lastRun);
  const configPath = prefs.configPath?.trim() ?? "";
  const configDir = configPath ? path.dirname(configPath) : "";

  const markdown = [
    "# Run Status",
    "",
    "Status applies to both **scheduled** (daily 04:00) and **manual** (Run Paper Agent) runs; they share the same state and last-run record.",
    "",
    "## Schedule",
    "",
    `- Installed: ${installed ? "Yes" : "No"}`,
    `- Scheduled time: 04:00 local time`,
    `- Today's result: ${todaySummary}`,
    `- Last successful day: ${lastSuccessDate ?? "Never"}`,
    "",
    "## Last Run (scheduled or manual)",
    "",
    `- Status: ${lastRun?.status ?? "Unknown"}`,
    `- Mode: ${lastRun?.mode ?? "Unknown"}`,
    `- Date: ${lastRun?.date ?? "Unknown"}`,
    `- Reason: ${formatReason(lastRun?.reason)}`,
    `- Exit code: ${lastRun?.exit_code ?? "Unknown"}`,
    `- Started at: ${lastRun?.started_at ?? "Unknown"}`,
    `- Finished at: ${lastRun?.finished_at ?? "Unknown"}`,
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
