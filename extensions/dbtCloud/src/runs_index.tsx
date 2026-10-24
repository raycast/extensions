import { List, showToast, Toast, ActionPanel, Action, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { ContextMetadata, dateAccessory, DateLabel, runStatus } from "./display";
import { Shortcuts } from "./shortcuts";
import { JSX, useEffect, useState, useCallback } from "react";
import { returnRuns } from "./fetch_runs";
import { RunsFetchResponse, RunModel } from "./types";
import { buildDbtCloudUrl, formatRelativeTime, formatDuration, cancelRun } from "./api";
import { RunGoTo } from "./navigation";

type StatusFilter = "all" | "success" | "error" | "running" | "queued" | "cancelled";

const getStatusIcon = (status: number): { source: Icon; tintColor: Color } => {
  switch (status) {
    case 10:
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case 20:
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    case 30:
      return { source: Icon.XmarkCircle, tintColor: Color.Orange };
    case 1:
      return { source: Icon.Clock, tintColor: Color.Blue };
    case 3:
      return { source: Icon.ArrowClockwise, tintColor: Color.Purple };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
};

const getStatusEmoji = (statusHumanized: string): string => {
  switch (statusHumanized?.toLowerCase()) {
    case "success":
      return "🎉";
    case "error":
      return "❌";
    case "cancelled":
      return "⚠️";
    case "running":
      return "🏃";
    case "queued":
      return "🕒";
    default:
      return "❓";
  }
};

const matchesStatusFilter = (run: RunModel, filter: StatusFilter): boolean => {
  if (filter === "all") return true;
  const statusMap: Record<StatusFilter, number[]> = {
    all: [],
    success: [10],
    error: [20],
    cancelled: [30],
    queued: [1],
    running: [3],
  };
  return statusMap[filter].includes(run.status);
};

// Run Detail Component
export function RunDetail({ run }: { run: RunModel }) {
  const runUrl = run.href || buildDbtCloudUrl(`/projects/${run.project_id}/runs/${run.id}`);
  const jobUrl = buildDbtCloudUrl(`/projects/${run.project_id}/jobs/${run.job_definition_id}`);

  const markdown = `
# ${run.job?.name || "Job Run"} - Run #${run.id}

## Status: ${getStatusEmoji(run.status_humanized)} ${run.status_humanized}

${run.status_message ? `> ${run.status_message}` : ""}

---

## Details

| Property | Value |
|----------|-------|
| **Run ID** | ${run.id} |
| **Job** | ${run.job?.name || "N/A"} |
| **Project ID** | ${run.project_id} |
| **Environment ID** | ${run.environment_id} |
| **dbt Version** | ${run.dbt_version || "N/A"} |
| **Git Branch** | \`${run.git_branch || "N/A"}\` |
| **Git SHA** | \`${run.git_sha?.substring(0, 7) || "N/A"}\` |

## Timing

| Metric | Value |
|--------|-------|
| **Created** | ${formatRelativeTime(run.created_at)} |
| **Started** | ${formatRelativeTime(run.started_at)} |
| **Finished** | ${formatRelativeTime(run.finished_at)} |
| **Duration** | ${run.duration_humanized || formatDuration(run.started_at, run.finished_at)} |
| **Queue Time** | ${run.queued_duration_humanized || "N/A"} |

## Artifacts

${run.artifacts_saved ? "✅ Artifacts saved" : "❌ No artifacts"}
${run.has_docs_generated ? "📚 Documentation generated" : ""}
${run.has_sources_generated ? "📊 Sources generated" : ""}

${run.trigger?.cause ? `\n## Trigger\n\n**Cause:** ${run.trigger.cause}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Run #${run.id}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={runStatus(run.status).label} color={runStatus(run.status).color} />
          </Detail.Metadata.TagList>
          <ContextMetadata
            projectId={run.project_id}
            environmentId={run.environment_id}
            jobName={run.job?.name || `Job ${run.job_definition_id}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Duration"
            text={run.duration_humanized || formatDuration(run.started_at, run.finished_at)}
            icon={Icon.Clock}
          />
          {run.queued_duration_humanized && (
            <Detail.Metadata.Label title="Queued For" text={run.queued_duration_humanized} />
          )}
          {run.run_duration_humanized && <Detail.Metadata.Label title="Ran For" text={run.run_duration_humanized} />}
          <DateLabel title="Started" date={run.started_at} />
          <DateLabel title="Finished" date={run.finished_at} />
          <Detail.Metadata.Separator />
          {run.trigger?.cause && <Detail.Metadata.Label title="Trigger" text={run.trigger.cause} />}
          <Detail.Metadata.Label title="Git Branch" text={run.git_branch || "default"} icon={Icon.Code} />
          {run.git_sha && <Detail.Metadata.Label title="Git SHA" text={run.git_sha.slice(0, 7)} />}
          <Detail.Metadata.Label title="dbt Version" text={run.dbt_version || "N/A"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Features">
            {run.artifacts_saved && <Detail.Metadata.TagList.Item text="Artifacts" color={Color.Green} />}
            {run.has_docs_generated && <Detail.Metadata.TagList.Item text="Docs" color={Color.Blue} />}
            {run.has_sources_generated && <Detail.Metadata.TagList.Item text="Sources" color={Color.Purple} />}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Run ID" text={run.id.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="dbt Cloud" target={runUrl} text="Open Run" />
          <Detail.Metadata.Link title="" target={jobUrl} text="Open Job" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={runUrl} title="Open Run in dbt Cloud" shortcut={Shortcuts.webRun} />
          <RunGoTo run={run} omit={["details"]} />
          {run.status === 3 && (
            <Action
              title="Cancel Run"
              shortcut={Shortcuts.cancel}
              icon={Icon.XmarkCircle}
              onAction={() => cancelRun(run.id)}
            />
          )}
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={jobUrl} title="Open Job in dbt Cloud" shortcut={Shortcuts.webJob} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Run ID" shortcut={Shortcuts.copyId} content={run.id.toString()} />
            <Action.CopyToClipboard title="Copy Run URL" shortcut={Shortcuts.copyPath} content={runUrl} />
            {run.git_sha && (
              <Action.CopyToClipboard title="Copy Git SHA" shortcut={Shortcuts.copySha} content={run.git_sha} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface RunListItemProps {
  run: RunModel;
}

const RunListItem = ({ run }: RunListItemProps): JSX.Element => {
  const { push } = useNavigation();
  const runUrl = run.href || buildDbtCloudUrl(`/projects/${run.project_id}/runs/${run.id}`);
  const jobUrl = buildDbtCloudUrl(`/projects/${run.project_id}/jobs/${run.job_definition_id}`);

  return (
    <List.Item
      id={run.id.toString()}
      title={run.job?.name || `Run #${run.id}`}
      subtitle={`${getStatusEmoji(run.status_humanized)} ${run.status_humanized}`}
      icon={getStatusIcon(run.status)}
      accessories={[
        ...(run.git_branch ? [{ tag: run.git_branch, tooltip: "Git branch" }] : []),
        {
          text: run.duration_humanized || formatDuration(run.started_at, run.finished_at),
          icon: Icon.Clock,
          tooltip: "Duration",
        },
        dateAccessory(run.finished_at || run.created_at, run.finished_at ? "Finished" : "Created"),
        { tag: { value: runStatus(run.status).label, color: runStatus(run.status).color } },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            shortcut={Shortcuts.details}
            icon={Icon.Eye}
            onAction={() => push(<RunDetail run={run} />)}
          />
          <RunGoTo run={run} omit={["details"]} />
          {run.status === 3 && (
            <Action
              title="Cancel Run"
              shortcut={Shortcuts.cancel}
              icon={Icon.XmarkCircle}
              onAction={() => cancelRun(run.id)}
            />
          )}
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={runUrl} title="Open Run in dbt Cloud" shortcut={Shortcuts.webRun} />
            <Action.OpenInBrowser
              url={jobUrl}
              title="Open Job in dbt Cloud"
              shortcut={Shortcuts.webJob}
              icon={Icon.Hammer}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Run ID" shortcut={Shortcuts.copyId} content={run.id.toString()} />
            <Action.CopyToClipboard title="Copy Run URL" shortcut={Shortcuts.copyPath} content={runUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  return <RunsList />;
}

export function RunsList({ jobId, scopeTitle }: { jobId?: number; scopeTitle?: string } = {}) {
  const [runs, setRuns] = useState<RunsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnRuns(jobId);
      setRuns(response);
    } catch {
      showToast(Toast.Style.Failure, "Failed loading Runs");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRuns = runs.filter((run) => matchesStatusFilter(run, statusFilter));

  // Group runs by job
  const runsByJob = filteredRuns.reduce(
    (acc, run) => {
      const jobName = run.job?.name || "Unknown Job";
      if (!acc[jobName]) {
        acc[jobName] = [];
      }
      acc[jobName].push(run);
      return acc;
    },
    {} as Record<string, RunModel[]>,
  );

  return (
    <List
      isLoading={loading}
      navigationTitle={scopeTitle ? `Runs · ${scopeTitle}` : undefined}
      searchBarPlaceholder="Filter runs by job name..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          storeValue
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="All Runs" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="🎉 Success" value="success" />
          <List.Dropdown.Item title="❌ Error" value="error" />
          <List.Dropdown.Item title="🏃 Running" value="running" />
          <List.Dropdown.Item title="🕒 Queued" value="queued" />
          <List.Dropdown.Item title="⚠️ Cancelled" value="cancelled" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No runs found"
        description={statusFilter !== "all" ? "Try changing the status filter" : "No job runs in your account"}
        icon="icon_64p.png"
      />

      {Object.entries(runsByJob).map(([jobName, jobRuns]) => (
        <List.Section key={jobName} title={jobName} subtitle={`${jobRuns.length} runs`}>
          {jobRuns.map((run) => (
            <RunListItem key={run.id} run={run} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
