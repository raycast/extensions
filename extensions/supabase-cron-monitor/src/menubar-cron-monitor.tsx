import {
  Color,
  Icon,
  Image,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  Clipboard,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  createSupabaseClient,
  fetchCronJobs,
  fetchLastRun,
  fetchRecentRuns,
  getDashboardUrl,
  getSqlEditorUrl,
} from "./supabase";
import { setupSql } from "./setupSql";
import { CronJobWithRun, FetchMode, JobRunDetail } from "./types";
import { computeJobStatus, formatDateTime, statusLabel } from "./utils";
import {
  DEFAULT_SETUP_MESSAGE,
  isMissingSetupError,
  toErrorMessage,
} from "./errors";

type MenuBarData = {
  jobs: CronJobWithRun[];
  recentRuns: JobRunDetail[];
  mode: FetchMode;
  lastUpdatedAt: Date;
};

const FAILED_JOBS_KEY = "menuBarFailedJobs";

export default function MenubarCronMonitor() {
  const preferences = getPreferenceValues<Preferences.MenubarCronMonitor>();
  const refreshMinutes = useMemo(
    () => parsePositiveInt(preferences.menuBarRefreshMinutes, 5),
    [preferences.menuBarRefreshMinutes],
  );
  const jobFilter = useMemo(
    () => preferences.menuBarJobFilter ?? "all",
    [preferences.menuBarJobFilter],
  );
  const client = useMemo(
    () => createSupabaseClient(preferences),
    [preferences.supabaseUrl, preferences.serviceRoleKey],
  );
  const sqlEditorUrl = useMemo(
    () => getSqlEditorUrl(preferences.supabaseUrl),
    [preferences.supabaseUrl],
  );
  const dashboardUrl = useMemo(
    () => getDashboardUrl(preferences.supabaseUrl),
    [preferences.supabaseUrl],
  );

  const runHistoryLimitValue = useMemo(
    () => parsePositiveInt(preferences.runHistoryLimit, 5),
    [preferences.runHistoryLimit],
  );

  const fetchMenuBarData = useCallback(async (): Promise<MenuBarData> => {
    const { jobs, mode } = await fetchCronJobs(client);
    const enriched = await Promise.all(
      jobs.map(async (job) => {
        try {
          const lastRun = await fetchLastRun(client, job.jobname, mode);
          return { ...job, lastRun };
        } catch (err) {
          return {
            ...job,
            lastRun: null,
            lastRunFetchError: toErrorMessage(err),
          };
        }
      }),
    );

    const recentRunsRaw = await fetchRecentRuns(
      client,
      runHistoryLimitValue,
      mode,
    );
    const jobNameMap = new Map<number, string>(
      jobs.map((job) => [job.jobid, job.jobname]),
    );
    const recentRuns = recentRunsRaw.map((run) => ({
      ...run,
      jobname: run.jobname ?? jobNameMap.get(run.jobid),
    }));
    return { jobs: enriched, recentRuns, mode, lastUpdatedAt: new Date() };
  }, [client, runHistoryLimitValue]);

  const { data, isLoading, revalidate, error } = usePromise(fetchMenuBarData);

  useEffect(() => {
    const interval = setInterval(
      () => {
        revalidate();
      },
      refreshMinutes * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [refreshMinutes, revalidate]);

  useEffect(() => {
    if (!data) return;
    const failedJobs = data.jobs
      .filter((job) => computeJobStatus(job) === "failed")
      .map((job) => job.jobname);

    const notify = async () => {
      const stored = await LocalStorage.getItem<string>(FAILED_JOBS_KEY);
      let previous: string[] = [];
      try {
        previous = stored ? JSON.parse(stored) : [];
      } catch {
        previous = [];
      }
      const newFailures = failedJobs.filter((name) => !previous.includes(name));

      if (newFailures.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Supabase cron job failed",
          message: newFailures.join(", "),
        });
      }

      if (failedJobs.length === 0) {
        await LocalStorage.removeItem(FAILED_JOBS_KEY);
      } else {
        await LocalStorage.setItem(FAILED_JOBS_KEY, JSON.stringify(failedJobs));
      }
    };

    void notify();
  }, [data]);

  const filteredJobs = useMemo(() => {
    if (!data) return [] as CronJobWithRun[];
    if (jobFilter === "active") return data.jobs.filter((job) => job.active);
    if (jobFilter === "failing")
      return data.jobs.filter((job) => computeJobStatus(job) === "failed");
    return data.jobs;
  }, [data, jobFilter]);

  const counts = useMemo(() => {
    if (!data) return { total: 0, active: 0, failing: 0, running: 0 };
    const statuses = data.jobs.map((job) => computeJobStatus(job));
    return {
      total: data.jobs.length,
      active: data.jobs.filter((job) => job.active).length,
      failing: statuses.filter((status) => status === "failed").length,
      running: statuses.filter((status) => status === "running").length,
    };
  }, [data]);

  const healthSummary = useMemo(() => {
    if (!data) return "Loading...";
    if (counts.total === 0) return "No jobs";
    if (counts.failing > 0) return `${counts.failing} failing`;
    if (counts.running > 0) return `${counts.running} running`;
    return "All healthy";
  }, [counts, data]);

  const healthIcon =
    counts.failing > 0
      ? Icon.ExclamationMark
      : counts.running > 0
        ? Icon.Play
        : Icon.CheckCircle;

  return (
    <MenuBarExtra
      icon={{
        source: preferences.customIconUrl || "icon.png",
        mask: Image.Mask.RoundedRectangle,
        fallback: "icon.png",
      }}
      tooltip="Supabase Cron Monitor"
      isLoading={isLoading}
      title=""
    >
      {error ? (
        <MenuBarExtra.Item
          title="Error"
          subtitle={
            isMissingSetupError(error)
              ? DEFAULT_SETUP_MESSAGE
              : toErrorMessage(error)
          }
          icon={Icon.ExclamationMark}
        />
      ) : null}

      <MenuBarExtra.Section title="Health">
        <MenuBarExtra.Item
          title="Status"
          subtitle={healthSummary}
          icon={healthIcon}
        />
        <MenuBarExtra.Item
          title="Active Jobs"
          subtitle={`${counts.active}`}
          icon={Icon.Play}
        />
        <MenuBarExtra.Item
          title="Failed Jobs"
          subtitle={`${counts.failing}`}
          icon={Icon.XmarkCircle}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Project">
        <MenuBarExtra.Item
          title="Project"
          subtitle={getProjectLabel(preferences.supabaseUrl)}
          icon={Icon.Globe}
        />
        <MenuBarExtra.Item
          title="Last Updated"
          subtitle={
            data ? formatDateTime(data.lastUpdatedAt.toISOString()) : "-"
          }
          icon={Icon.Clock}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Jobs">
        {filteredJobs.map((job) => {
          const status = computeJobStatus(job);
          return (
            <MenuBarExtra.Item
              key={`${job.jobid}-${job.jobname}`}
              title={job.jobname}
              subtitle={`${statusLabel(status)} • ${job.schedule}`}
              icon={statusIcon(status)}
              onAction={() =>
                launchCommand({
                  name: "cron-jobs",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          );
        })}
        {filteredJobs.length === 0 && <MenuBarExtra.Item title="No jobs" />}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Recent Runs">
        {data?.recentRuns?.map((run) => (
          <MenuBarExtra.Item
            key={`${run.runid}-${run.start_time}`}
            title={run.jobname || `Job ${run.jobid}`}
            subtitle={formatDateTime(run.start_time)}
            icon={statusIconFromRun(run)}
          />
        ))}
        {data?.recentRuns?.length === 0 && (
          <MenuBarExtra.Item title="No runs" />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.Repeat}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item
          title="Open Cron Jobs"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "cron-jobs",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Cron Runs"
          icon={Icon.Clock}
          onAction={() =>
            launchCommand({
              name: "cron-runs",
              type: LaunchType.UserInitiated,
            })
          }
        />
        {dashboardUrl ? (
          <MenuBarExtra.Item
            title="Open Supabase Dashboard"
            icon={Icon.Window}
            onAction={() => open(dashboardUrl)}
          />
        ) : null}
        {sqlEditorUrl ? (
          <MenuBarExtra.Item
            title="Open Supabase Sql Editor"
            icon={Icon.Code}
            onAction={() => open(sqlEditorUrl)}
          />
        ) : null}
        <MenuBarExtra.Item
          title="Copy Setup Sql"
          icon={Icon.Clipboard}
          onAction={() => Clipboard.copy(setupSql)}
        />
        <MenuBarExtra.Item
          title="Preferences..."
          icon={Icon.Gear}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function statusIcon(status: "running" | "success" | "failed" | "unknown") {
  switch (status) {
    case "running":
      return { source: Icon.Play, tintColor: Color.Blue };
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    default:
      return {
        source: Icon.QuestionMarkCircle,
        tintColor: Color.SecondaryText,
      };
  }
}

function statusIconFromRun(run: JobRunDetail) {
  const status = run.status.toLowerCase();
  if (status.includes("running") || status.includes("start"))
    return statusIcon("running");
  if (status.includes("failed") || status.includes("error"))
    return statusIcon("failed");
  if (status.includes("success") || status.includes("succeeded"))
    return statusIcon("success");
  return statusIcon("unknown");
}

function getProjectLabel(supabaseUrl: string): string {
  try {
    const url = new URL(supabaseUrl);
    const match = url.hostname.match(/^([^.]+)\.supabase\.co$/);
    if (!match) return supabaseUrl;
    return match[1];
  } catch {
    return supabaseUrl;
  }
}
