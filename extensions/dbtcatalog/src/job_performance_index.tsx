import { List, showToast, Toast, ActionPanel, Action, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { returnJobs } from "./fetch_jobs";
import { JobModel } from "./types";
import { buildDbtCloudUrl, fetchJobRunMetrics, formatRelativeTime } from "./api";

interface JobRunMetric {
  runId: number;
  jobId: number;
  jobName: string;
  status: number;
  statusHumanized: string;
  executeStartedAt: string | null;
  executeCompletedAt: string | null;
  executionTime: number;
  runElapsedTime: number;
  createdAt: string;
  finishedAt: string | null;
}

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

const formatSeconds = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

// Job Performance Detail Component
function JobPerformanceDetail({ job }: { job: JobModel }) {
  const [runs, setRuns] = useState<JobRunMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRunMetrics() {
      try {
        setLoading(true);
        const metrics = await fetchJobRunMetrics(job.id, 50);
        // Filter to only successful runs for cleaner metrics
        const successfulRuns = metrics.filter((m: JobRunMetric) => m.status === 10);
        setRuns(successfulRuns);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to load run metrics");
      } finally {
        setLoading(false);
      }
    }
    loadRunMetrics();
  }, [job.id]);

  const jobUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}`);
  const runHistoryUrl = buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}/runs`);

  // Calculate statistics
  const executionTimes = runs.map((r) => r.executionTime).filter((t) => t > 0);
  const avgExecution =
    executionTimes.length > 0 ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length : 0;
  const minExecution = executionTimes.length > 0 ? Math.min(...executionTimes) : 0;
  const maxExecution = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;

  // Create sparkline for execution times (simple text-based)
  const createSparkline = () => {
    if (runs.length === 0) return "";

    const recentRuns = runs.slice(0, 20).reverse(); // Get most recent 20 runs
    const times = recentRuns.map((r) => r.executionTime);
    const max = Math.max(...times);
    const min = Math.min(...times);
    const range = max - min;

    if (range === 0) return "▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅▅"; // All same value

    const bars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    return times
      .map((time) => {
        const normalized = (time - min) / range;
        const barIndex = Math.min(Math.floor(normalized * bars.length), bars.length - 1);
        return bars[barIndex];
      })
      .join("");
  };

  // Create run history table
  const runHistoryTable = runs
    .slice(0, 10)
    .map((run, index) => {
      const trend =
        index > 0 && runs[index - 1] ? (run.executionTime > runs[index - 1].executionTime ? "📈" : "📉") : "—";
      return `| ${getStatusEmoji(run.statusHumanized)} | #${run.runId} | ${formatSeconds(
        run.executionTime
      )} | ${trend} | ${formatRelativeTime(run.finishedAt)} |`;
    })
    .join("\n");

  const markdown = `
# ${job.name} - Performance Analytics

${
  loading
    ? "Loading metrics..."
    : `
## Overview

| Metric | Value |
|--------|-------|
| **Total Successful Runs** | ${runs.length} |
| **Average Execution Time** | ${formatSeconds(avgExecution)} |
| **Fastest Run** | ${formatSeconds(minExecution)} |
| **Slowest Run** | ${formatSeconds(maxExecution)} |

## Execution Time Trend (Last 20 Runs)

\`\`\`
${createSparkline()}
\`\`\`

_Each bar represents one run, from oldest (left) to newest (right)_

## Recent Run History

| Status | Run | Duration | Trend | Finished |
|--------|-----|----------|-------|----------|
${runHistoryTable}

---

💡 **Tip:** Track execution times to identify performance degradation or improvements in your dbt jobs.
`
}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${job.name} - Performance`}
      isLoading={loading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Job Name" text={job.name} />
          <Detail.Metadata.Label title="Project" text={job.project?.name || `ID: ${job.project_id}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Avg Duration" text={formatSeconds(avgExecution)} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Min Duration" text={formatSeconds(minExecution)} icon={Icon.ArrowDown} />
          <Detail.Metadata.Label title="Max Duration" text={formatSeconds(maxExecution)} icon={Icon.ArrowUp} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Successful Runs" text={String(runs.length)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open in dbt Cloud" target={jobUrl} text="View Job" />
          <Detail.Metadata.Link title="Run History" target={runHistoryUrl} text="View All Runs" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={runHistoryUrl} title="View Run History" />
          <Action.OpenInBrowser url={jobUrl} title="Open Job in dbt Cloud" />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Job ID" content={job.id.toString()} />
            <Action.CopyToClipboard title="Copy Job Name" content={job.name} />
            <Action.CopyToClipboard title="Copy Average Duration" content={formatSeconds(avgExecution)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface JobListItemProps {
  job: JobModel;
}

const JobPerformanceListItem = ({ job }: JobListItemProps): JSX.Element => {
  const { push } = useNavigation();
  const recentRunStatus = job.most_recent_run?.status_humanized;
  const recentRunEmoji = getStatusEmoji(recentRunStatus || "");
  const recentDuration = job.most_recent_run?.duration_humanized || "N/A";

  return (
    <List.Item
      id={job.id.toString()}
      title={job.name}
      subtitle={job.project?.name || `Project ${job.project_id}`}
      icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
      accessories={[{ text: `Last: ${recentRunEmoji} ${recentDuration}` }]}
      actions={
        <ActionPanel>
          <Action
            title="View Performance"
            icon={Icon.BarChart}
            onAction={() => push(<JobPerformanceDetail job={job} />)}
          />
          <Action.OpenInBrowser
            url={buildDbtCloudUrl(`/projects/${job.project_id}/jobs/${job.id}/runs`)}
            title="View Run History"
          />
        </ActionPanel>
      }
    />
  );
};

export default function JobPerformanceIndex() {
  const [jobs, setJobs] = useState<JobModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnJobs();
      // Filter to only active jobs with recent runs
      const activeJobs = response.filter((job) => !job.deactivated && job.most_recent_run);
      setJobs(activeJobs);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group jobs by project
  const jobsByProject = jobs.reduce((acc, job) => {
    const projectKey = job.project?.name || `Project ${job.project_id}`;
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(job);
    return acc;
  }, {} as Record<string, JobModel[]>);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search jobs..." throttle>
      <List.EmptyView
        title="No active jobs found"
        description="Only active jobs with recent runs are shown"
        icon="icon_64p.png"
      />

      {Object.entries(jobsByProject).map(([projectName, projectJobs]) => (
        <List.Section key={projectName} title={projectName} subtitle={`${projectJobs.length} jobs`}>
          {projectJobs.map((job) => (
            <JobPerformanceListItem key={job.id} job={job} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
