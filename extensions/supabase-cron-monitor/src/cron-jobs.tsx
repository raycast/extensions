import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { JobRuns } from "./job-runs";
import {
  DEFAULT_SETUP_MESSAGE,
  isMissingSetupError,
  toErrorMessage,
} from "./errors";
import { setupSql } from "./setupSql";
import {
  createSupabaseClient,
  fetchCronJobs,
  fetchLastRun,
  getSqlEditorUrl,
} from "./supabase";
import { CronJobWithRun, FetchMode } from "./types";
import {
  computeJobStatus,
  formatDateTime,
  formatDuration,
  statusLabel,
} from "./utils";

type ViewState = {
  isLoading: boolean;
  jobs: CronJobWithRun[];
  error?: string;
  missingSetup: boolean;
  mode: FetchMode;
};

export default function CronJobs() {
  const preferences = getPreferenceValues<Preferences.CronJobs>();
  const [state, setState] = useState<ViewState>({
    isLoading: true,
    jobs: [],
    error: undefined,
    missingSetup: false,
    mode: "view",
  });

  const autoRefreshMinutes = useMemo(
    () => parsePositiveInt(preferences.autoRefreshMinutes, 60),
    [preferences.autoRefreshMinutes],
  );
  const runHistoryLimit = useMemo(
    () => parsePositiveInt(preferences.runHistoryLimit, 5),
    [preferences.runHistoryLimit],
  );
  const client = useMemo(
    () => createSupabaseClient(preferences),
    [preferences.supabaseUrl, preferences.serviceRoleKey],
  );
  const sqlEditorUrl = useMemo(
    () => getSqlEditorUrl(preferences.supabaseUrl),
    [preferences.supabaseUrl],
  );

  const loadJobs = useCallback(
    async (showErrors: boolean) => {
      setState((current) => ({ ...current, isLoading: true }));
      try {
        const { jobs, mode } = await fetchCronJobs(client);
        const enriched = await Promise.all(
          jobs.map(async (job) => {
            try {
              const lastRun = await fetchLastRun(client, job.jobname, mode);
              return { ...job, lastRun };
            } catch (error) {
              return {
                ...job,
                lastRun: null,
                lastRunFetchError: toErrorMessage(error),
              };
            }
          }),
        );

        setState({
          isLoading: false,
          jobs: enriched,
          error: undefined,
          missingSetup: false,
          mode,
        });
      } catch (error) {
        const message = toErrorMessage(error, DEFAULT_SETUP_MESSAGE);
        const missingSetup = isMissingSetupError(error);
        setState({
          isLoading: false,
          jobs: [],
          error: message,
          missingSetup,
          mode: "view",
        });

        if (showErrors) {
          await showToast({
            style: Toast.Style.Failure,
            title: missingSetup ? "Setup required" : "Failed to load cron jobs",
            message,
          });
        }
      }
    },
    [client],
  );

  useEffect(() => {
    void loadJobs(true);
  }, [loadJobs]);

  useEffect(() => {
    if (autoRefreshMinutes <= 0) return;
    const interval = setInterval(
      () => {
        void loadJobs(false);
      },
      autoRefreshMinutes * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [autoRefreshMinutes, loadJobs]);

  const emptyTitle = state.missingSetup
    ? "Setup required"
    : state.error
      ? "Unable to load cron jobs"
      : "No cron jobs found";
  const emptyDescription = state.missingSetup
    ? DEFAULT_SETUP_MESSAGE
    : state.error
      ? state.error
      : "Create a pg_cron job to see it here.";

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search cron jobs">
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            {sqlEditorUrl ? (
              <Action.OpenInBrowser
                title="Open Supabase Sql Editor"
                url={sqlEditorUrl}
              />
            ) : null}
            <Action.CopyToClipboard title="Copy Setup Sql" content={setupSql} />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={() => void openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />

      {state.jobs.map((job) => {
        const status = computeJobStatus(job);
        const lastRunText = job.lastRun
          ? `Last: ${formatDateTime(job.lastRun.start_time)}`
          : job.lastRunFetchError
            ? "Last run unavailable"
            : "No runs";

        return (
          <List.Item
            key={`${job.jobid}-${job.jobname}`}
            title={job.jobname}
            subtitle={job.schedule}
            icon={statusIcon(status)}
            accessories={[
              { text: lastRunText, icon: Icon.Clock },
              {
                text: job.active ? "Active" : "Paused",
                icon: job.active ? Icon.Play : Icon.Pause,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={jobDetailMarkdown(job)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={statusLabel(status)}
                      icon={statusIcon(status)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Schedule"
                      text={job.schedule}
                    />
                    <List.Item.Detail.Metadata.TagList title="Active">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={job.active ? "Yes" : "No"}
                        color={job.active ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    {job.database ? (
                      <List.Item.Detail.Metadata.Label
                        title="Database"
                        text={job.database}
                      />
                    ) : null}
                    {job.username ? (
                      <List.Item.Detail.Metadata.Label
                        title="User"
                        text={job.username}
                      />
                    ) : null}
                    {job.nodename ? (
                      <List.Item.Detail.Metadata.Label
                        title="Node"
                        text={job.nodename}
                      />
                    ) : null}
                    {typeof job.nodeport === "number" ? (
                      <List.Item.Detail.Metadata.Label
                        title="Node Port"
                        text={String(job.nodeport)}
                      />
                    ) : null}
                    <List.Item.Detail.Metadata.Separator />
                    {job.lastRun ? (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="Last Run"
                          text={formatDateTime(job.lastRun.start_time)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Duration"
                          text={formatDuration(
                            job.lastRun.start_time,
                            job.lastRun.end_time,
                          )}
                        />
                      </>
                    ) : null}
                    {job.lastRunFetchError ? (
                      <List.Item.Detail.Metadata.Label
                        title="Run Error"
                        text={job.lastRunFetchError}
                      />
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.Repeat}
                  onAction={() => void loadJobs(true)}
                />
                <Action.Push
                  title="View Run History"
                  icon={Icon.List}
                  target={
                    <JobRuns
                      client={client}
                      job={job}
                      mode={state.mode}
                      limit={runHistoryLimit}
                    />
                  }
                />
                {sqlEditorUrl ? (
                  <Action.OpenInBrowser
                    title="Open Supabase Sql Editor"
                    url={sqlEditorUrl}
                  />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy Setup Sql"
                  content={setupSql}
                />
                <Action.CopyToClipboard
                  title="Copy Job Command"
                  content={job.command ?? ""}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={() => void openExtensionPreferences()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
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

function jobDetailMarkdown(job: CronJobWithRun): string {
  const command = job.command?.trim();
  const lastRunStatus = job.lastRun?.status?.trim();
  const returnMessage = job.lastRun?.return_message?.trim();

  const sections: string[] = [`# ${job.jobname}`];

  if (command) {
    sections.push("## Command", `\`\`\`sql\n${command}\n\`\`\``);
  }

  if (lastRunStatus) {
    sections.push("## Last Run Status", lastRunStatus);
  }

  if (returnMessage) {
    sections.push("## Return Message", returnMessage);
  }

  return sections.join("\n\n");
}
