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
import { ContextMetadata, dateAccessory, DateLabel, environmentTag, useAccountNames } from "./display";
import { Shortcuts } from "./shortcuts";
import { JSX, useEffect, useState, useCallback } from "react";
import { returnJobs } from "./fetch_jobs";
import { EnvironmentModel, JobsFetchResponse, JobModel } from "./types";
import { buildDbtCloudUrl, triggerJobRun, formatRelativeTime } from "./api";
import { JobGoTo } from "./navigation";

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
export function JobDetail({ job, onTrigger }: { job: JobModel; onTrigger?: () => void }) {
  const names = useAccountNames();
  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
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
| **Project** | ${names.projectName(job.project_id)} |
| **Environment** | ${names.environmentName(job.environment_id)} |
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
      onTrigger?.();
    }
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={job.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={job.deactivated ? "Inactive" : "Active"}
              color={job.deactivated ? Color.SecondaryText : Color.Green}
            />
          </Detail.Metadata.TagList>
          <ContextMetadata projectId={job.project_id} environmentId={job.environment_id} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Triggers">
            {triggerTypes.map((trigger) => (
              <Detail.Metadata.TagList.Item key={trigger} text={trigger} color={Color.Blue} />
            ))}
          </Detail.Metadata.TagList>
          {job.triggers?.schedule && job.schedule?.cron && (
            <Detail.Metadata.Label title="Schedule" text={job.schedule.cron} icon={Icon.Calendar} />
          )}
          {job.next_run_humanized && (
            <Detail.Metadata.Label title="Next Run" text={job.next_run_humanized} icon={Icon.Clock} />
          )}
          <Detail.Metadata.Label title="Threads" text={String(job.settings?.threads || "Default")} />
          <Detail.Metadata.Label title="Timeout" text={`${job.execution?.timeout_seconds || 0}s`} />
          <Detail.Metadata.Separator />
          <DateLabel title="Created" date={job.created_at} />
          <DateLabel title="Updated" date={job.updated_at} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Job ID" text={job.id.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="dbt Cloud" target={jobUrl} text="Open Job" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!job.deactivated && (
            <Action
              title="Trigger Job Run"
              icon={Icon.Terminal}
              onAction={handleTrigger}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          )}
          <JobGoTo job={job} omit={["details"]} />
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={jobUrl} title="Open Job and Runs in dbt Cloud" shortcut={Shortcuts.webJob} />
            <Action.OpenInBrowser
              url={settingsUrl}
              title="Open Job Settings in dbt Cloud"
              shortcut={Shortcuts.webSettings}
              icon={Icon.Gear}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" shortcut={Shortcuts.copyId} content={job.id.toString()} />
            <Action.CopyToClipboard title="Copy Job Name" shortcut={Shortcuts.copyName} content={job.name} />
            {job.execute_steps?.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Execute Steps"
                shortcut={Shortcuts.copySteps}
                content={job.execute_steps.join("\n")}
              />
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
  environment?: EnvironmentModel;
}

const JobListItem = ({ job, onRefresh, environment }: JobListItemProps): JSX.Element => {
  const { push } = useNavigation();
  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
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
        ...(environment
          ? [{ tag: { value: environment.name, color: environmentTag(environment).color }, tooltip: "Environment" }]
          : []),
        ...(job.next_run_humanized ? [{ text: job.next_run_humanized, icon: Icon.Calendar, tooltip: "Next run" }] : []),
        job.deactivated
          ? { tag: { value: "Inactive", color: Color.SecondaryText } }
          : { tag: { value: "Active", color: Color.Green } },
        dateAccessory(job.updated_at, "Updated"),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            shortcut={Shortcuts.details}
            icon={Icon.Eye}
            onAction={() => push(<JobDetail job={job} onTrigger={onRefresh} />)}
          />
          {!job.deactivated && (
            <Action
              title="Trigger Job Run"
              icon={Icon.Terminal}
              onAction={handleTrigger}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          )}
          <JobGoTo job={job} omit={["details"]} />
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={jobUrl} title="Open Job and Runs in dbt Cloud" shortcut={Shortcuts.webJob} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" shortcut={Shortcuts.copyId} content={job.id.toString()} />
            <Action.CopyToClipboard title="Copy Job Name" shortcut={Shortcuts.copyName} content={job.name} />
            {job.execute_steps?.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Execute Steps"
                shortcut={Shortcuts.copySteps}
                content={job.execute_steps.join("\n")}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

type JobFilter = "all" | "active" | "inactive" | "scheduled" | "webhook";

export interface JobsScope {
  projectId?: number;
  environmentId?: number;
  scopeTitle?: string;
}

export default function Command() {
  return <JobsList />;
}

export function JobsList({ projectId, environmentId, scopeTitle }: JobsScope = {}) {
  const names = useAccountNames();
  const [jobs, setJobs] = useState<JobsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<JobFilter>("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnJobs(projectId);
      setJobs(environmentId ? response.filter((job) => job.environment_id === environmentId) : response);
    } catch {
      showToast(Toast.Style.Failure, "Failed loading Jobs");
    } finally {
      setLoading(false);
    }
  }, [projectId, environmentId]);

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
  const jobsByProject = filteredJobs.reduce(
    (acc, job) => {
      const projectKey = names.projectName(job.project_id);
      if (!acc[projectKey]) {
        acc[projectKey] = [];
      }
      acc[projectKey].push(job);
      return acc;
    },
    {} as Record<string, JobModel[]>,
  );

  return (
    <List
      isLoading={loading}
      navigationTitle={scopeTitle ? `Jobs · ${scopeTitle}` : undefined}
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
            <JobListItem
              key={job.id}
              job={job}
              onRefresh={fetchData}
              environment={names.environment(job.environment_id)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
