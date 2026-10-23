import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { buildDbtCloudUrl, fetchJobRunMetrics, formatRelativeTime } from "./api";
import { DEPLOYMENT_TYPE_INFO, inferDeploymentType } from "./environment_utils";
import { returnEnvironments } from "./fetch_environments";
import { returnJobs } from "./fetch_jobs";
import { returnProjects } from "./fetch_projects";
import { buildDurationChart, ChartPoint, ChartStatus } from "./duration_chart";
import { JobDetail } from "./jobs_index";
import { RunsList } from "./runs_index";
import { EnvironmentModel, JobModel } from "./types";

// Enough history for a 30-day window on jobs that run every couple of hours
const MAX_RUNS = 500;
const WINDOWS = [7, 14, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS = { success: 10, error: 20, cancelled: 30 };

const getStatusEmoji = (status: number): string => {
  switch (status) {
    case STATUS.success:
      return "🟢";
    case STATUS.error:
      return "🔴";
    case STATUS.cancelled:
      return "⚪️";
    case 3:
      return "🏃";
    default:
      return "🕒";
  }
};

const formatSeconds = (seconds: number | null): string => {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

interface JobContext {
  job: JobModel;
  projectName: string;
  environment?: EnvironmentModel;
}

export function JobPerformanceDetail({ job, projectName, environment }: JobContext) {
  const [days, setDays] = useState(14);
  const { data: runs = [], isLoading } = useCachedPromise(fetchJobRunMetrics, [job.id, MAX_RUNS]);

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - days * DAY_MS);
  const inWindow = runs.filter((run) => new Date(run.createdAt) >= windowStart);
  const succeeded = inWindow.filter((run) => run.status === STATUS.success);
  const errored = inWindow.filter((run) => run.status === STATUS.error);
  const cancelled = inWindow.filter((run) => run.status === STATUS.cancelled);
  const completed = succeeded.length + errored.length;
  const successRate = completed > 0 ? `${((succeeded.length / completed) * 100).toFixed(2)}%` : "—";

  const durations = succeeded.map((run) => run.executionTime).filter((t): t is number => t !== null);
  const average = durations.length > 0 ? durations.reduce((sum, t) => sum + t, 0) / durations.length : null;
  const slowest = durations.length > 0 ? Math.max(...durations) : null;

  const chartStatus: Record<number, ChartStatus> = {
    [STATUS.success]: "success",
    [STATUS.error]: "error",
    [STATUS.cancelled]: "cancelled",
  };
  const points: ChartPoint[] = inWindow.flatMap((run) =>
    run.executionTime !== null && run.finishedAt && chartStatus[run.status]
      ? [{ time: new Date(run.finishedAt), seconds: run.executionTime, status: chartStatus[run.status] }]
      : [],
  );
  const chart = buildDurationChart(points, windowStart, windowEnd);
  const truncated =
    runs.length >= MAX_RUNS && runs[runs.length - 1] && new Date(runs[runs.length - 1].createdAt) > windowStart;

  const runRows = inWindow
    .slice(0, 15)
    .map(
      (run) =>
        `| ${getStatusEmoji(run.status)} ${run.statusHumanized} | [#${run.runId}](${run.href}) | ${formatSeconds(run.executionTime)} | ${
          run.gitBranch ?? "—"
        } | ${(run.triggerCause ?? "—").replace(/\|/g, "\\|")} | ${formatRelativeTime(run.finishedAt ?? run.createdAt)} |`,
    )
    .join("\n");

  const environmentName = environment?.name ?? `Environment ${job.environment_id}`;
  const markdown = isLoading
    ? `# ${job.name}\n\nLoading runs...`
    : `# ${job.name}

**Recent runs** · ${formatDate(windowStart)} – ${formatDate(windowEnd)}

| Success rate | Completed | Succeeded | Errored | Cancelled |
|:--:|:--:|:--:|:--:|:--:|
| **${successRate}** | ${completed} | ${succeeded.length} | ${errored.length} | ${cancelled.length} |

${chart ? `![Build duration in minutes](${chart})\n\n🟢 success · 🔴 error · ⚪️ cancelled — execution time per run` : "_No finished runs in this window._"}
${truncated ? `\n> Only the newest ${MAX_RUNS} runs were loaded, so the start of this window is incomplete.\n` : ""}
## Runs

| Status | Run | Duration | Branch | Trigger | Finished |
|--------|-----|----------|--------|---------|----------|
${runRows || "| — | — | — | — | — | — |"}
`;

  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${job.name} · Last ${days} days`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Project" text={projectName} />
          <Detail.Metadata.TagList title="Environment">
            <Detail.Metadata.TagList.Item
              text={environmentName}
              color={environment && inferDeploymentType(environment) === "production" ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Schedule"
            text={job.triggers?.schedule ? job.schedule?.cron || "Scheduled" : "Not scheduled"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Success Rate" text={successRate} />
          <Detail.Metadata.Label title="Average Duration" text={formatSeconds(average)} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Median Duration" text={formatSeconds(median(durations))} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Slowest Run" text={formatSeconds(slowest)} icon={Icon.ArrowUp} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="dbt Cloud" target={jobUrl} text="Open Job" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Job" icon={Icon.Hammer} target={<JobDetail job={job} />} />
          <Action.Push
            title="View Run History"
            icon={Icon.List}
            target={<RunsList jobId={job.id} scopeTitle={job.name} />}
          />
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={jobUrl} title="Open Job in dbt Cloud" />
            {inWindow[0] && (
              <Action.OpenInBrowser url={inWindow[0].href} title="Open Latest Run in dbt Cloud" icon={Icon.Play} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Time Window">
            {WINDOWS.filter((window) => window !== days).map((window) => (
              <Action
                key={window}
                title={`Show Last ${window} Days`}
                icon={Icon.Calendar}
                shortcut={{ modifiers: ["cmd"], key: String(WINDOWS.indexOf(window) + 1) as Keyboard.KeyEquivalent }}
                onAction={() => setDays(window)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" content={job.id.toString()} />
            <Action.CopyToClipboard title="Copy Success Rate" content={successRate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function JobPerformanceIndex() {
  const [projectFilter, setProjectFilter] = useState("all");
  const { data, isLoading } = useCachedPromise(async () => {
    const [jobs, projects, environments] = await Promise.all([returnJobs(), returnProjects(), returnEnvironments()]);
    return { jobs, projects, environments };
  });

  const projectNames = useMemo(() => new Map((data?.projects ?? []).map((p) => [p.id, p.name])), [data]);
  const environments = useMemo(() => new Map((data?.environments ?? []).map((e) => [e.id, e])), [data]);

  // Group active jobs by project, then environment (production first)
  const sections = useMemo(() => {
    const groups = new Map<string, { title: string; order: string; jobs: JobContext[] }>();
    for (const job of data?.jobs ?? []) {
      if (job.deactivated) continue;
      if (projectFilter !== "all" && String(job.project_id) !== projectFilter) continue;
      const projectName = projectNames.get(job.project_id) ?? `Project ${job.project_id}`;
      const environment = environments.get(job.environment_id);
      const rank = environment ? DEPLOYMENT_TYPE_INFO[inferDeploymentType(environment)].sortOrder : 9;
      const key = `${job.project_id}:${job.environment_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          title: `${projectName} › ${environment?.name ?? `Environment ${job.environment_id}`}`,
          order: `${projectName}\u0000${rank}`,
          jobs: [],
        });
      }
      groups.get(key)?.jobs.push({ job, projectName, environment });
    }
    return Array.from(groups.values()).sort((a, b) => a.order.localeCompare(b.order));
  }, [data, projectFilter, projectNames, environments]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search jobs..."
      searchBarAccessory={
        <List.Dropdown tooltip="Project" storeValue onChange={setProjectFilter}>
          <List.Dropdown.Item title="All Projects" value="all" />
          {[...(data?.projects ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((project) => (
              <List.Dropdown.Item key={project.id} title={project.name} value={String(project.id)} />
            ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No active jobs found" icon="icon_64p.png" />
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={`${section.jobs.length} jobs`}>
          {section.jobs.map(({ job, projectName, environment }) => {
            const deployment = environment ? DEPLOYMENT_TYPE_INFO[inferDeploymentType(environment)] : undefined;
            return (
              <List.Item
                key={job.id}
                title={job.name}
                keywords={[projectName, environment?.name ?? ""]}
                icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
                accessories={[
                  ...(deployment ? [{ tag: deployment.displayName }] : []),
                  { text: job.triggers?.schedule ? "Scheduled" : "Not scheduled", icon: Icon.Calendar },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Performance"
                      icon={Icon.BarChart}
                      target={<JobPerformanceDetail job={job} projectName={projectName} environment={environment} />}
                    />
                    <Action.Push title="View Job" icon={Icon.Hammer} target={<JobDetail job={job} />} />
                    <Action.OpenInBrowser
                      url={buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`)}
                      title="Open Job in dbt Cloud"
                    />
                    <Action.CopyToClipboard title="Copy Job ID" content={job.id.toString()} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
