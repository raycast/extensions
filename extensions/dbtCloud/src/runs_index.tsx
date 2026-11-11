import {
  List,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Icon,
  Color,
  Detail,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { ContextMetadata, dateAccessory, DateLabel, plural, runStatus, useAccountNames } from "./display";
import { Shortcuts } from "./shortcuts";
import { JSX, useEffect, useState, useCallback } from "react";
import { returnRuns } from "./fetch_runs";
import { RunsFetchResponse, RunModel } from "./types";
import { buildDbtCloudUrl, formatRelativeTime, formatDuration, cancelRun } from "./api";
import { RunGoTo } from "./navigation";

type StatusFilter = "all" | "success" | "error" | "running" | "queued" | "cancelled";

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
  const names = useAccountNames();
  const inProgress = [1, 2, 3].includes(run.status);
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
| **Project** | ${names.projectName(run.project_id)} |
| **Environment** | ${names.environmentName(run.environment_id)} |
| **dbt Version** | ${run.dbt_version || "N/A"} |
| **Git Branch** | \`${run.git_branch || "N/A"}\` |
| **Git SHA** | \`${run.git_sha?.substring(0, 7) || "N/A"}\` |

## Timing

| Metric | Value |
|--------|-------|
| **Created** | ${formatRelativeTime(run.created_at)} |
| **Started** | ${formatRelativeTime(run.started_at)} |
| **Finished** | ${inProgress ? "In progress" : formatRelativeTime(run.finished_at)} |
| **Duration** | ${run.duration_humanized || formatDuration(run.started_at, run.finished_at)} |
| **Queue Time** | ${run.queued_duration_humanized || "N/A"} |

${
  inProgress
    ? ""
    : `## Artifacts

${run.artifacts_saved ? "✅ Artifacts saved" : "❌ No artifacts"}
${run.has_docs_generated ? "📚 Documentation generated" : ""}
${run.has_sources_generated ? "📊 Sources generated" : ""}`
}

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
          {inProgress ? (
            <Detail.Metadata.Label title="Finished" text="In progress" />
          ) : (
            <DateLabel title="Finished" date={run.finished_at} />
          )}
          <Detail.Metadata.Separator />
          {run.trigger?.cause && <Detail.Metadata.Label title="Trigger" text={run.trigger.cause} />}
          <Detail.Metadata.Label title="Git Branch" text={run.git_branch || "default"} icon={Icon.Code} />
          {run.git_sha && <Detail.Metadata.Label title="Git SHA" text={run.git_sha.slice(0, 7)} />}
          <Detail.Metadata.Label title="dbt Version" text={run.dbt_version || "N/A"} />
          {(run.artifacts_saved || run.has_docs_generated || run.has_sources_generated) && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Features">
                {run.artifacts_saved && <Detail.Metadata.TagList.Item text="Artifacts" color={Color.Green} />}
                {run.has_docs_generated && <Detail.Metadata.TagList.Item text="Docs" color={Color.Blue} />}
                {run.has_sources_generated && <Detail.Metadata.TagList.Item text="Sources" color={Color.Purple} />}
              </Detail.Metadata.TagList>
            </>
          )}
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
          {run.status === 3 && <CancelRunAction run={run} />}
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

// Cancelling stops work mid-run, so ask first, as Trigger does
function CancelRunAction({ run }: { run: RunModel }): JSX.Element {
  const handleCancel = async () => {
    const confirmed = await confirmAlert({
      title: "Cancel Run",
      message: `Are you sure you want to cancel run #${run.id}${run.job?.name ? ` of "${run.job.name}"` : ""}?`,
      primaryAction: { title: "Cancel Run", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep Running" },
    });

    if (confirmed) {
      await cancelRun(run.id);
    }
  };

  return (
    <Action
      title="Cancel Run"
      shortcut={Shortcuts.cancel}
      icon={Icon.XmarkCircle}
      style={Action.Style.Destructive}
      onAction={handleCancel}
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
      subtitle={`#${run.id}`}
      icon={{ source: runStatus(run.status).icon, tintColor: runStatus(run.status).color }}
      accessories={[
        ...(run.git_branch ? [{ tag: run.git_branch, tooltip: "Git branch" }] : []),
        {
          text: run.run_duration_humanized || run.duration_humanized || formatDuration(run.started_at, run.finished_at),
          icon: Icon.Clock,
          tooltip: "Run time (excluding time queued)",
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
          {run.status === 3 && <CancelRunAction run={run} />}
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
  const [searchText, setSearchText] = useState("");

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
      filtering
      onSearchTextChange={setSearchText}
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
        description={
          searchText
            ? `No runs match "${searchText}"${statusFilter !== "all" ? " with this status" : ""}`
            : statusFilter !== "all"
              ? "Try changing the status filter"
              : jobId
                ? "This job has no runs yet"
                : "No job runs in your account"
        }
        icon="icon_64p.png"
      />

      {Object.entries(runsByJob).map(([jobName, jobRuns]) => (
        <List.Section key={jobName} title={jobName} subtitle={plural(jobRuns.length, "run")}>
          {jobRuns.map((run) => (
            <RunListItem key={run.id} run={run} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
