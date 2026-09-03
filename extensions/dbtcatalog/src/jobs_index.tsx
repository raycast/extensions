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
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { returnJobs } from "./fetch_jobs";
import { JobsFetchResponse, JobModel } from "./types";
import { buildDbtCloudUrl, triggerJobRun, formatRelativeTime } from "./api";

function getJobIcon(job: JobModel): { source: Icon; tintColor: Color } {
  if (job.deactivated) {
    return { source: Icon.XmarkCircle, tintColor: Color.Red };
  }
  if (job.triggers?.schedule) {
    return { source: Icon.Clock, tintColor: Color.Blue };
  }
  if (job.triggers?.github_webhook || job.triggers?.git_provider_webhook) {
    return { source: Icon.ArrowClockwise, tintColor: Color.Purple };
  }
  return { source: Icon.Hammer, tintColor: Color.Green };
}

function getJobTypeEmoji(job: JobModel): string {
  if (job.deactivated) return "⏸️";
  if (job.triggers?.schedule) return "⏰";
  if (job.triggers?.github_webhook || job.triggers?.git_provider_webhook) return "🔄";
  return "🔨";
}

function getTriggerTypes(job: JobModel): string[] {
  const types: string[] = [];
  if (job.triggers?.schedule) types.push("Scheduled");
  if (job.triggers?.github_webhook) types.push("GitHub Webhook");
  if (job.triggers?.git_provider_webhook) types.push("Git Provider");
  if (job.triggers_on_draft_pr) types.push("Draft PR");
  if (types.length === 0) types.push("Manual");
  return types;
}

// Job Detail Component
function JobDetail({ job, onTrigger }: { job: JobModel; onTrigger: () => void }) {
  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
  const runHistoryUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}/runs`);
  const settingsUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}/settings`);

  const triggerTypes = getTriggerTypes(job);
  const recentRun = job.most_recent_run;

  const markdown = `
# ${job.name}

${job.description || "_No description provided_"}

---

## Configuration

| Property | Value |
|----------|-------|
| **Job ID** | ${job.id} |
| **Project** | ${job.project?.name || job.project_id} |
| **Environment** | ${job.environment?.name || job.environment_id} |
| **Status** | ${job.deactivated ? "⏸️ Inactive" : "✅ Active"} |
| **dbt Version** | ${job.dbt_version || "Environment Default"} |
| **Threads** | ${job.settings?.threads || "N/A"} |
| **Target** | ${job.settings?.target_name || "N/A"} |

## Triggers

${triggerTypes.map((t) => `- ${t}`).join("\n")}

${job.schedule?.cron ? `**Schedule:** \`${job.schedule.cron}\`` : ""}
${job.next_run_humanized ? `**Next Run:** ${job.next_run_humanized}` : ""}

## Execute Steps

\`\`\`bash
${job.execute_steps?.join("\n") || "No steps defined"}
\`\`\`

## Features

${job.generate_docs ? "✅ Generate Docs" : "❌ Generate Docs"}
${job.run_generate_sources ? "✅ Run Source Freshness" : "❌ Run Source Freshness"}
${job.run_compare_changes ? "✅ Compare Changes" : "❌ Compare Changes"}

${
  recentRun
    ? `
## Most Recent Run

| Property | Value |
|----------|-------|
| **Run ID** | ${recentRun.id} |
| **Status** | ${recentRun.status_humanized} |
| **Finished** | ${recentRun.finished_at_humanized || formatRelativeTime(recentRun.finished_at)} |
| **Duration** | ${recentRun.duration_humanized || "N/A"} |
`
    : ""
}
`;

  const handleTrigger = async () => {
    const confirmed = await confirmAlert({
      title: "Trigger Job Run",
      message: `Are you sure you want to trigger "${job.name}"?`,
      primaryAction: {
        title: "Trigger",
      },
    });

    if (confirmed) {
      await triggerJobRun(job.id, "Triggered from Raycast");
      onTrigger();
    }
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={job.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={job.deactivated ? "Inactive" : "Active"}
            icon={job.deactivated ? Icon.XmarkCircle : Icon.Checkmark}
          />
          <Detail.Metadata.Label title="Project" text={job.project?.name || `ID: ${job.project_id}`} />
          <Detail.Metadata.Label title="Environment" text={job.environment?.name || `ID: ${job.environment_id}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Triggers" text={triggerTypes.join(", ")} />
          {job.next_run_humanized && <Detail.Metadata.Label title="Next Run" text={job.next_run_humanized} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Threads" text={String(job.settings?.threads || "Default")} />
          <Detail.Metadata.Label title="Timeout" text={`${job.execution?.timeout_seconds || 0}s`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open in dbt Cloud" target={jobUrl} text="View Job" />
          <Detail.Metadata.Link title="Run History" target={runHistoryUrl} text="View Runs" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!job.deactivated && (
            <Action
              title="Trigger Job Run"
              icon={Icon.Terminal}
              onAction={handleTrigger}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action.OpenInBrowser url={jobUrl} title="Open in dbt Cloud" />
          <Action.OpenInBrowser url={runHistoryUrl} title="View Run History" icon={Icon.List} />
          <Action.OpenInBrowser url={settingsUrl} title="Job Settings" icon={Icon.Gear} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" content={job.id.toString()} />
            <Action.CopyToClipboard title="Copy Job Name" content={job.name} />
            {job.execute_steps?.length > 0 && (
              <Action.CopyToClipboard title="Copy Execute Steps" content={job.execute_steps.join("\n")} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface JobListItemProps {
  job: JobModel;
  onRefresh: () => void;
}

const JobListItem = ({ job, onRefresh }: JobListItemProps): JSX.Element => {
  const { push } = useNavigation();
  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
  const runHistoryUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}/runs`);
  const jobIcon = getJobIcon(job);
  const triggerTypes = getTriggerTypes(job);

  const handleTrigger = async () => {
    const confirmed = await confirmAlert({
      title: "Trigger Job Run",
      message: `Are you sure you want to trigger "${job.name}"?`,
      primaryAction: {
        title: "Trigger",
      },
    });

    if (confirmed) {
      await triggerJobRun(job.id, "Triggered from Raycast");
      onRefresh();
    }
  };

  const recentRunStatus = job.most_recent_run?.status_humanized;
  const recentRunEmoji =
    recentRunStatus === "Success"
      ? "🎉"
      : recentRunStatus === "Error"
      ? "❌"
      : recentRunStatus === "Running"
      ? "🏃"
      : "";

  return (
    <List.Item
      id={job.id.toString()}
      title={job.name}
      subtitle={`${getJobTypeEmoji(job)} ${triggerTypes.join(", ")}`}
      icon={jobIcon}
      accessories={[
        ...(recentRunEmoji ? [{ text: `Last: ${recentRunEmoji}` }] : []),
        { text: job.deactivated ? "⏸️ Inactive" : "✅ Active" },
        ...(job.next_run_humanized ? [{ text: `Next: ${job.next_run_humanized}` }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.Eye}
            onAction={() => push(<JobDetail job={job} onTrigger={onRefresh} />)}
          />
          {!job.deactivated && (
            <Action
              title="Trigger Job Run"
              icon={Icon.Terminal}
              onAction={handleTrigger}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser url={jobUrl} title="Open Job in dbt Cloud" />
            <Action.OpenInBrowser url={runHistoryUrl} title="View Run History" icon={Icon.List} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" content={job.id.toString()} />
            <Action.CopyToClipboard title="Copy Job Name" content={job.name} />
            {job.execute_steps?.length > 0 && (
              <Action.CopyToClipboard title="Copy Execute Steps" content={job.execute_steps.join("\n")} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

type JobFilter = "all" | "active" | "inactive" | "scheduled" | "webhook";

export default function JobsList() {
  const [jobs, setJobs] = useState<JobsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<JobFilter>("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnJobs();
      setJobs(response);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading Jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredJobs = jobs.filter((job) => {
    switch (filter) {
      case "active":
        return !job.deactivated;
      case "inactive":
        return job.deactivated;
      case "scheduled":
        return job.triggers?.schedule;
      case "webhook":
        return job.triggers?.github_webhook || job.triggers?.git_provider_webhook;
      default:
        return true;
    }
  });

  // Group jobs by project name if available, otherwise by project_id
  const jobsByProject = filteredJobs.reduce((acc, job) => {
    const projectKey = job.project?.name || `Project ${job.project_id}`;
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(job);
    return acc;
  }, {} as Record<string, JobModel[]>);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Filter jobs by name..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Jobs" storeValue onChange={(value) => setFilter(value as JobFilter)}>
          <List.Dropdown.Item title="All Jobs" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="✅ Active Only" value="active" />
          <List.Dropdown.Item title="⏸️ Inactive Only" value="inactive" />
          <List.Dropdown.Item title="⏰ Scheduled" value="scheduled" />
          <List.Dropdown.Item title="🔄 Webhook Triggered" value="webhook" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No jobs found"
        description={filter !== "all" ? "Try changing the filter" : "No jobs in your account"}
        icon="icon_64p.png"
      />

      {Object.entries(jobsByProject).map(([projectName, projectJobs]) => (
        <List.Section key={projectName} title={projectName} subtitle={`${projectJobs.length} jobs`}>
          {projectJobs.map((job) => (
            <JobListItem key={job.id} job={job} onRefresh={fetchData} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
