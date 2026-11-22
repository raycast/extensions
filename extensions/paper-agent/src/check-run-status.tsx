import {
  Action,
  ActionPanel,
  Detail,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useRef, useState } from "react";
import { DAILY_SCHEDULE_LABEL, getSchedulePaths } from "./run-utils";
import {
  checkCoreUpdate,
  CoreInstallation,
  CORE_RELEASES_URL,
  EXTENSION_BUILD,
  readCoreInstallation,
  UPDATE_GUIDE_URL,
} from "./installation-status";

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
    const value: unknown = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, item]) => typeof item === "string" || (key === "exit_code" && typeof item === "number"),
      ),
    ) as LastRunStatus;
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
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [installation, setInstallation] = useState<CoreInstallation>();
  const [installationError, setInstallationError] = useState<string>();
  const installationVersion = useRef<Promise<string | null>>(Promise.resolve(null));
  const [updateStatus, setUpdateStatus] = useState("Not checked. Use Check Core Update to contact GitHub.");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const updateController = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

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

    setError(undefined);
    setInstallation(undefined);
    setInstallationError(undefined);
    setUpdateStatus("Not checked. Use Check Core Update to contact GitHub.");
    setCheckingUpdate(false);
    const inspection = readCoreInstallation(prefs, controller.signal);
    installationVersion.current = inspection.then(
      (value) => value.version,
      () => null,
    );
    void inspection.then(
      (value) => {
        if (!cancelled) setInstallation(value);
      },
      (cause: unknown) => {
        if (!cancelled) {
          setInstallationError(cause instanceof Error ? cause.message : "Could not inspect the core installation.");
        }
      },
    );
    void loadStatus().catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not read run status.");
    });

    return () => {
      cancelled = true;
      controller.abort();
      updateController.current?.abort();
    };
  }, [retry, prefs.configPath, prefs.pythonPath]);

  async function checkUpdate() {
    updateController.current?.abort();
    const controller = new AbortController();
    updateController.current = controller;
    setCheckingUpdate(true);
    setUpdateStatus("Checking the installed core and latest stable release...");
    try {
      const result = await checkCoreUpdate(installationVersion.current, controller.signal);
      if (!controller.signal.aborted) setUpdateStatus(result);
    } catch {
      if (!controller.signal.aborted)
        setUpdateStatus("Could not check for updates. Check your connection and try again.");
    } finally {
      if (!controller.signal.aborted) setCheckingUpdate(false);
    }
  }

  if (error) {
    return (
      <Detail
        navigationTitle="Run Status"
        markdown={`# Could not load run status\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => setRetry((value) => value + 1)} />
          </ActionPanel>
        }
      />
    );
  }

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
    "## Installation and Updates",
    "",
    `- Core: ${installation ? (installation.version ?? "Unpackaged; version unknown") : (installationError ?? "Checking...")}`,
    ...(installation ? [`- Python: ${installation.pythonVersion}`, `- Core module: ${installation.modulePath}`] : []),
    `- Extension build: ${EXTENSION_BUILD}`,
    `- Extension source: ${environment.isDevelopment ? "Development (update from your checkout)" : "Raycast Store (updates managed by Raycast)"}`,
    `- Raycast: ${environment.raycastVersion}`,
    `- Core update: ${updateStatus}`,
    "",
    "The Python core and Raycast extension update separately. Checking for updates does not install anything or run the pipeline.",
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
      isLoading={checkingUpdate}
      markdown={markdown}
      navigationTitle="Run Status"
      actions={
        <ActionPanel>
          <Action title="Refresh Status" onAction={() => setRetry((value) => value + 1)} />
          <Action title="Check Core Update" onAction={checkUpdate} />
          <Action.OpenInBrowser title="Open Update Guide" url={UPDATE_GUIDE_URL} />
          <Action.OpenInBrowser title="Open Latest Core Release" url={CORE_RELEASES_URL} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
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
