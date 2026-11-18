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
import {
  DEFAULT_SETUP_MESSAGE,
  isMissingSetupError,
  toErrorMessage,
} from "./errors";
import { setupSql } from "./setupSql";
import {
  createSupabaseClient,
  fetchCronJobs,
  fetchRecentRuns,
  getSqlEditorUrl,
} from "./supabase";
import { FetchMode, JobRunDetail } from "./types";
import {
  formatDateTime,
  formatDuration,
  jobRunHadErrors,
  normalizeStatus,
  statusLabel,
} from "./utils";

type RunState = {
  isLoading: boolean;
  runs: JobRunDetail[];
  error?: string;
  missingSetup: boolean;
  mode: FetchMode;
};

export default function CronRuns() {
  const preferences = getPreferenceValues<Preferences.CronRuns>();
  const [state, setState] = useState<RunState>({
    isLoading: true,
    runs: [],
    error: undefined,
    missingSetup: false,
    mode: "view",
  });

  const runHistoryLimit = useMemo(
    () => parsePositiveInt(preferences.runHistoryLimit, 25),
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

  const loadRuns = useCallback(
    async (showErrors: boolean) => {
      setState((current) => ({ ...current, isLoading: true }));
      try {
        const { jobs, mode } = await fetchCronJobs(client);
        const jobNameMap = new Map<number, string>(
          jobs.map((job) => [job.jobid, job.jobname]),
        );
        const runs = await fetchRecentRuns(client, runHistoryLimit, mode);
        const enriched = runs.map((run) => ({
          ...run,
          jobname:
            run.jobname ?? jobNameMap.get(run.jobid) ?? `Job ${run.jobid}`,
        }));
        setState({
          isLoading: false,
          runs: enriched,
          error: undefined,
          missingSetup: false,
          mode,
        });
      } catch (error) {
        const message = toErrorMessage(error, DEFAULT_SETUP_MESSAGE);
        const missingSetup = isMissingSetupError(error);
        setState({
          isLoading: false,
          runs: [],
          error: message,
          missingSetup,
          mode: "view",
        });

        if (showErrors) {
          await showToast({
            style: Toast.Style.Failure,
            title: missingSetup
              ? "Setup required"
              : "Failed to load run history",
            message,
          });
        }
      }
    },
    [client, runHistoryLimit],
  );

  useEffect(() => {
    void loadRuns(true);
  }, [loadRuns]);

  const emptyTitle = state.missingSetup
    ? "Setup required"
    : state.error
      ? "Unable to load run history"
      : "No runs found";
  const emptyDescription = state.missingSetup
    ? DEFAULT_SETUP_MESSAGE
    : state.error
      ? state.error
      : "No recent runs were found.";

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search cron runs">
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

      {state.runs.map((run) => {
        const normalizedStatus = normalizeStatus(run.status);
        const status =
          normalizedStatus.includes("running") ||
          normalizedStatus.includes("start")
            ? "running"
            : jobRunHadErrors(run)
              ? "failed"
              : "success";
        const duration = formatDuration(run.start_time, run.end_time);

        return (
          <List.Item
            key={`${run.runid}-${run.start_time}`}
            title={run.jobname ?? `Job ${run.jobid}`}
            subtitle={formatDateTime(run.start_time)}
            icon={statusIcon(status)}
            accessories={[{ text: duration }, { text: statusLabel(status) }]}
            detail={
              <List.Item.Detail
                markdown={runDetailMarkdown(run)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={statusLabel(status)}
                      icon={statusIcon(status)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Start"
                      text={formatDateTime(run.start_time)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={duration}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Database"
                      text={run.database}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="User"
                      text={run.username}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.Repeat}
                  onAction={() => void loadRuns(true)}
                />
                <Action.CopyToClipboard
                  title="Copy Return Message"
                  content={run.return_message ?? ""}
                />
                <Action.CopyToClipboard
                  title="Copy Command"
                  content={run.command ?? ""}
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

function runDetailMarkdown(run: JobRunDetail): string {
  const jobTitle = run.jobname ? `# ${run.jobname}` : `# Job ${run.jobid}`;
  const returnMessage = run.return_message?.trim();
  const command = run.command?.trim();

  const sections: string[] = [jobTitle];

  if (command) {
    sections.push("## Command", `\`\`\`sql\n${command}\n\`\`\``);
  }

  if (returnMessage) {
    sections.push("## Return Message", returnMessage);
  }

  return sections.join("\n\n");
}
