import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getGatewayClient } from "./lib/gateway-client";
import type { CronJob, CronRunLogEntry, CronStatusResult } from "./lib/types";

interface CronJobsState {
  loading: boolean;
  error?: string;
  jobs: CronJob[];
  status?: CronStatusResult;
}

function formatSchedule(job: CronJob): string {
  const schedule = job.schedule;
  if (schedule.type === "cron" && schedule.cron) {
    return `Cron: ${schedule.cron}`;
  }
  if (schedule.type === "interval" && schedule.intervalMs) {
    const minutes = Math.floor(schedule.intervalMs / 60000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `Every ${hours}h`;
    }
    return `Every ${minutes}m`;
  }
  if (schedule.type === "once" && schedule.runAtMs) {
    return `Once at ${new Date(schedule.runAtMs).toLocaleString()}`;
  }
  return "Unknown schedule";
}

function formatNextRun(job: CronJob): string {
  const nextRunAtMs = job.state.nextRunAtMs;
  if (!nextRunAtMs) return "Not scheduled";

  const now = Date.now();
  const diff = nextRunAtMs - now;

  if (diff < 0) return "Overdue";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `In ${days}d ${hours % 24}h`;
  if (hours > 0) return `In ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `In ${minutes}m`;
  return "Soon";
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function JobRunHistory({ job }: { job: CronJob }) {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<CronRunLogEntry[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadRuns();
  }, [job.id]);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const client = getGatewayClient();
      const entries = await client.cronRuns(job.id, 20);
      setRuns(entries);
      setError(undefined);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load run history",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Detail isLoading markdown="Loading run history..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={loadRuns}
            />
          </ActionPanel>
        }
      />
    );
  }

  let md = `# ${job.name}\n\n`;
  md += `**Schedule**: ${formatSchedule(job)}\n`;
  md += `**Next Run**: ${formatNextRun(job)}\n`;
  md += `**Status**: ${job.enabled ? "Enabled" : "Disabled"}\n\n`;

  if (job.description) {
    md += `${job.description}\n\n`;
  }

  md += "## Run History\n\n";

  if (runs.length === 0) {
    md += "*No runs recorded*\n";
  } else {
    md += "| Time | Status | Duration | Summary |\n";
    md += "|------|--------|----------|----------|\n";

    for (const run of runs) {
      const time = formatTimestamp(run.ts);
      const status = run.status || run.action;
      const duration = run.durationMs ? formatDuration(run.durationMs) : "-";
      const summary = run.summary || run.error || "-";
      md += `| ${time} | ${status} | ${duration} | ${summary.slice(0, 50)} |\n`;
    }
  }

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadRuns}
          />
        </ActionPanel>
      }
    />
  );
}

export default function CronJobsCommand() {
  const [state, setState] = useState<CronJobsState>({
    loading: true,
    jobs: [],
  });
  const [showDisabled, setShowDisabled] = useState(true);

  const loadJobs = async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));

    try {
      const client = getGatewayClient();
      await client.connect();

      const [jobs, status] = await Promise.all([
        client.cronList(true),
        client.cronStatus(),
      ]);

      setState({
        loading: false,
        jobs,
        status,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load cron jobs";
      setState({
        loading: false,
        jobs: [],
        error: message,
      });
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Cron Jobs",
        message,
      });
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const runJob = async (job: CronJob) => {
    showToast({
      style: Toast.Style.Animated,
      title: `Running ${job.name}...`,
    });

    try {
      const client = getGatewayClient();
      await client.cronRun(job.id, "force");

      showToast({
        style: Toast.Style.Success,
        title: `${job.name} Started`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run job";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Run Job",
        message,
      });
    }
  };

  const toggleJob = async (job: CronJob) => {
    const newEnabled = !job.enabled;
    const action = newEnabled ? "Enabling" : "Disabling";

    showToast({
      style: Toast.Style.Animated,
      title: `${action} ${job.name}...`,
    });

    try {
      const client = getGatewayClient();
      await client.cronUpdate(job.id, { enabled: newEnabled });

      // Update local state
      setState((s) => ({
        ...s,
        jobs: s.jobs.map((j) =>
          j.id === job.id ? { ...j, enabled: newEnabled } : j,
        ),
      }));

      showToast({
        style: Toast.Style.Success,
        title: `${job.name} ${newEnabled ? "Enabled" : "Disabled"}`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update job";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Job",
        message,
      });
    }
  };

  const filteredJobs = state.jobs.filter((job) => showDisabled || job.enabled);

  // Sort by next run time (enabled jobs first)
  filteredJobs.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    const aNext = a.state.nextRunAtMs || Infinity;
    const bNext = b.state.nextRunAtMs || Infinity;
    return aNext - bNext;
  });

  return (
    <List
      isLoading={state.loading}
      searchBarPlaceholder="Search cron jobs..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Jobs"
          value={showDisabled ? "all" : "enabled"}
          onChange={(value) => setShowDisabled(value === "all")}
        >
          <List.Dropdown.Item title="All Jobs" value="all" />
          <List.Dropdown.Item title="Enabled Only" value="enabled" />
        </List.Dropdown>
      }
    >
      {state.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Cron Jobs"
          description={state.error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={loadJobs}
              />
            </ActionPanel>
          }
        />
      ) : filteredJobs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Cron Jobs"
          description="No scheduled tasks found"
        />
      ) : (
        filteredJobs.map((job) => (
          <List.Item
            key={job.id}
            icon={job.enabled ? Icon.Clock : Icon.XMarkCircle}
            title={job.name}
            subtitle={formatSchedule(job)}
            accessories={[
              { text: formatNextRun(job) },
              {
                tag: {
                  value: job.enabled ? "Enabled" : "Disabled",
                  color: job.enabled ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Run History"
                    icon={Icon.List}
                    target={<JobRunHistory job={job} />}
                  />
                  <Action
                    title="Run Now"
                    icon={Icon.Play}
                    onAction={() => runJob(job)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={job.enabled ? "Disable Job" : "Enable Job"}
                    icon={job.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                    onAction={() => toggleJob(job)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadJobs}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
