import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { fetchJobRuns } from "./supabase";
import { CronJob, FetchMode, JobRunDetail } from "./types";
import {
  formatDateTime,
  formatDuration,
  jobRunHadErrors,
  normalizeStatus,
  statusLabel,
} from "./utils";
import { isMissingSetupError, toErrorMessage } from "./errors";

type RunState = {
  isLoading: boolean;
  runs: JobRunDetail[];
  error?: string;
  missingSetup: boolean;
};

type JobRunsProps = {
  client: SupabaseClient;
  job: CronJob;
  mode: FetchMode;
  limit: number;
};

export function JobRuns({ client, job, mode, limit }: JobRunsProps) {
  const [state, setState] = useState<RunState>({
    isLoading: true,
    runs: [],
    error: undefined,
    missingSetup: false,
  });

  const loadRuns = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true }));
    try {
      const runs = await fetchJobRuns(client, job.jobname, limit, mode);
      setState({
        isLoading: false,
        runs,
        error: undefined,
        missingSetup: false,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      const missingSetup = isMissingSetupError(error);
      setState({ isLoading: false, runs: [], error: message, missingSetup });

      if (missingSetup) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Setup required",
          message,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load run history",
          message,
        });
      }
    }
  }, [client, job.jobname, limit, mode]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const emptyDescription = useMemo(() => {
    if (state.missingSetup) return state.error;
    if (state.error) return state.error;
    return "No runs found for this job.";
  }, [state.error, state.missingSetup]);

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder={`Run history for ${job.jobname}`}
    >
      <List.EmptyView
        title={state.error ? "Unable to load runs" : "No runs"}
        description={emptyDescription}
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
            title={statusLabel(status)}
            subtitle={formatDateTime(run.start_time)}
            icon={statusIcon(status)}
            accessories={[{ text: duration }]}
            detail={
              <List.Item.Detail
                markdown={runDetailMarkdown(job.jobname, run)}
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
                <Action.CopyToClipboard
                  title="Copy Return Message"
                  content={run.return_message ?? ""}
                />
                <Action.CopyToClipboard
                  title="Copy Command"
                  content={run.command ?? ""}
                />
                <Action
                  title="Refresh"
                  icon={Icon.Repeat}
                  onAction={() => void loadRuns()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
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

function runDetailMarkdown(jobName: string, run: JobRunDetail): string {
  const returnMessage = run.return_message?.trim();
  const command = run.command?.trim();

  const sections: string[] = [`# ${jobName}`];

  if (command) {
    sections.push("## Command", `\`\`\`sql\n${command}\n\`\`\``);
  }

  if (returnMessage) {
    sections.push("## Return Message", returnMessage);
  }

  return sections.join("\n\n");
}
