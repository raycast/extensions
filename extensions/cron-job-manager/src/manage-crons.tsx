import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  CronJob,
  loadCronJobs,
  deleteCronJob,
  getNextRunTimes,
  runCronJob,
} from "./cron-utils";
import {
  jobKey,
  getJobSummary,
  RunLog,
  formatRelativeTime,
  formatDuration,
  getLastRun,
} from "./log-store";
import { AddEditCronForm } from "./AddEditCronForm";
import { RunLogsView } from "./RunLogsView";
import cronstrue from "cronstrue";

interface JobRunState {
  lastRun: RunLog | null;
  totalRuns: number;
  failureCount: number;
  running: boolean;
}

export default function ManageCrons() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runState, setRunState] = useState<Record<string, JobRunState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadCronJobs();
      setJobs(loaded);

      const summaries = await Promise.all(
        loaded
          .filter((j) => j.type === "job")
          .map(async (j) => {
            const key = jobKey(j.schedule, j.command);
            const summary = await getJobSummary(key);
            return { key, summary };
          }),
      );

      const newState: Record<string, JobRunState> = {};
      for (const { key, summary } of summaries) {
        newState[key] = {
          lastRun: summary.lastRun,
          totalRuns: summary.totalRuns,
          failureCount: summary.failureCount,
          running: false,
        };
      }
      setRunState(newState);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load cron jobs",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (job: CronJob) => {
    const confirmed = await confirmAlert({
      title: "Delete Cron Job?",
      message: `Are you sure you want to delete this job?\n\n${job.schedule} ${job.command}`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteCronJob(job);
      await showToast({
        style: Toast.Style.Success,
        title: "Cron job deleted",
      });
      await refresh();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String(err),
      });
    }
  };

  const handleRunNow = async (job: CronJob) => {
    const key = jobKey(job.schedule, job.command);
    setRunState((prev) => ({
      ...prev,
      [key]: { ...prev[key], running: true },
    }));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running…",
      message: job.command.slice(0, 60),
    });

    try {
      const result = await runCronJob(job);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `Finished in ${formatDuration(result.durationMs)}`;
        toast.message =
          result.stdout.trim().split("\n").slice(-1)[0] || "No output";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed (exit ${result.exitCode}) after ${formatDuration(result.durationMs)}`;
        toast.message =
          (result.stderr || result.stdout).trim().split("\n").slice(-1)[0] ||
          "";
      }

      const lastRun = await getLastRun(key);
      const summary = await getJobSummary(key);
      setRunState((prev) => ({
        ...prev,
        [key]: {
          lastRun,
          totalRuns: summary.totalRuns,
          failureCount: summary.failureCount,
          running: false,
        },
      }));
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Run failed";
      toast.message = String(err);
      setRunState((prev) => ({
        ...prev,
        [key]: { ...prev[key], running: false },
      }));
    }
  };

  const filtered = jobs.filter(
    (j) =>
      !searchText ||
      j.command.toLowerCase().includes(searchText.toLowerCase()) ||
      j.schedule.toLowerCase().includes(searchText.toLowerCase()) ||
      (j.comment && j.comment.toLowerCase().includes(searchText.toLowerCase())),
  );

  const enabledJobs = filtered.filter((j) => j.type === "job" && !j.disabled);
  const disabledJobs = filtered.filter((j) => j.type === "job" && j.disabled);
  const envVars = filtered.filter((j) => j.type === "env");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cron jobs…"
      onSearchTextChange={setSearchText}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Add New Cron Job"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<AddEditCronForm onSave={refresh} />)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
        </ActionPanel>
      }
    >
      {!isLoading && jobs.length === 0 && (
        <List.EmptyView
          title="No Cron Jobs Found"
          description="Press ⌘N to add your first cron job"
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action
                title="Add New Cron Job"
                icon={Icon.Plus}
                onAction={() => push(<AddEditCronForm onSave={refresh} />)}
              />
            </ActionPanel>
          }
        />
      )}

      {enabledJobs.length > 0 && (
        <List.Section
          title="Active Jobs"
          subtitle={`${enabledJobs.length} job${enabledJobs.length !== 1 ? "s" : ""}`}
        >
          {enabledJobs.map((job, i) => {
            const key = jobKey(job.schedule, job.command);
            return (
              <CronJobItem
                key={i}
                job={job}
                runState={runState[key]}
                onDelete={handleDelete}
                onRefresh={refresh}
                onRunNow={handleRunNow}
              />
            );
          })}
        </List.Section>
      )}

      {disabledJobs.length > 0 && (
        <List.Section title="Disabled Jobs" subtitle={`${disabledJobs.length}`}>
          {disabledJobs.map((job, i) => (
            <CronJobItem
              key={i}
              job={job}
              runState={undefined}
              onDelete={handleDelete}
              onRefresh={refresh}
              onRunNow={handleRunNow}
            />
          ))}
        </List.Section>
      )}

      {envVars.length > 0 && (
        <List.Section
          title="Environment Variables"
          subtitle={`${envVars.length}`}
        >
          {envVars.map((job, i) => (
            <CronJobItem
              key={i}
              job={job}
              runState={undefined}
              onDelete={handleDelete}
              onRefresh={refresh}
              onRunNow={handleRunNow}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CronJobItem({
  job,
  runState,
  onDelete,
  onRefresh,
  onRunNow,
}: {
  job: CronJob;
  runState: JobRunState | undefined;
  onDelete: (j: CronJob) => void;
  onRefresh: () => void;
  onRunNow: (j: CronJob) => void;
}) {
  const { push } = useNavigation();

  if (job.type === "env") {
    return (
      <List.Item
        icon={{ source: Icon.Gear, tintColor: Color.Blue }}
        title={job.raw}
        accessories={[{ tag: { value: "ENV", color: Color.Blue } }]}
        detail={<List.Item.Detail markdown={"```\n" + job.raw + "\n```"} />}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Line" content={job.raw} />
            <Action
              title="Add New Cron Job"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => push(<AddEditCronForm onSave={onRefresh} />)}
            />
          </ActionPanel>
        }
      />
    );
  }

  let humanReadable = job.schedule;
  try {
    humanReadable = cronstrue.toString(job.schedule, {
      throwExceptionOnParseError: false,
    });
  } catch {
    // Intentionally ignored — fallback to raw schedule string
  }

  const nextRuns = job.disabled ? [] : getNextRunTimes(job.schedule, 1);
  const nextRun = nextRuns[0];
  const nextRunText = nextRun ? formatNextRun(nextRun) : "";
  const lastRun = runState?.lastRun ?? null;
  const isRunning = runState?.running ?? false;

  const accessories: List.Item.Accessory[] = [];

  if (isRunning) {
    accessories.push({ tag: { value: "running…", color: Color.Blue } });
  } else if (lastRun) {
    accessories.push({
      icon: lastRun.success
        ? { source: Icon.CheckCircle, tintColor: Color.Green }
        : { source: Icon.XMarkCircle, tintColor: Color.Red },
      tooltip: lastRun.success
        ? `Last run OK · ${formatRelativeTime(lastRun.startedAt)} · ${formatDuration(lastRun.durationMs)}`
        : `Last run FAILED · exit ${lastRun.exitCode} · ${formatRelativeTime(lastRun.startedAt)}`,
    });
    accessories.push({ text: formatRelativeTime(lastRun.startedAt) });
  }

  if (!isRunning && nextRunText && !job.disabled) {
    accessories.push({ text: nextRunText, icon: Icon.Clock });
  }

  if (job.disabled) {
    accessories.push({
      tag: { value: "disabled", color: Color.SecondaryText },
    });
  }

  const detailMd = buildDetailMarkdown(
    job,
    humanReadable,
    nextRuns,
    lastRun,
    runState,
  );

  return (
    <List.Item
      icon={
        isRunning
          ? { source: Icon.CircleProgress, tintColor: Color.Blue }
          : job.disabled
            ? { source: Icon.CircleDisabled, tintColor: Color.SecondaryText }
            : lastRun && !lastRun.success
              ? { source: Icon.Circle, tintColor: Color.Red }
              : { source: Icon.Circle, tintColor: Color.Green }
      }
      title={job.comment || job.command}
      subtitle={job.comment ? job.command : undefined}
      keywords={[job.schedule, job.command, job.comment ?? ""]}
      accessories={accessories}
      detail={<List.Item.Detail markdown={detailMd} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Run">
            <Action
              title={isRunning ? "Running…" : "Run Now"}
              icon={isRunning ? Icon.CircleProgress : Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => !isRunning && onRunNow(job)}
            />
            <Action
              title="View Run Logs"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() =>
                push(<RunLogsView job={job} onRunNow={() => onRunNow(job)} />)
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Edit"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                push(<AddEditCronForm job={job} onSave={onRefresh} />)
              }
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onDelete(job)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Crontab Line"
              content={job.raw}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Command"
              content={job.command}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Add New Cron Job"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => push(<AddEditCronForm onSave={onRefresh} />)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildDetailMarkdown(
  job: CronJob,
  humanReadable: string,
  nextRuns: Date[],
  lastRun: RunLog | null,
  runState: JobRunState | undefined,
): string {
  const parts: string[] = [];

  parts.push(`## ${job.comment || job.command}`);
  parts.push("");
  parts.push(`**Schedule:** \`${job.schedule}\`  `);
  parts.push(`**Runs:** ${humanReadable}`);
  parts.push("");
  parts.push("**Command**");
  parts.push("```sh");
  parts.push(job.command);
  parts.push("```");
  parts.push("");

  if (nextRuns.length > 0 && !job.disabled) {
    parts.push("**⏳ Next run**");
    parts.push("");
    for (const d of nextRuns) parts.push(`_${formatAbsolute(d)}_`);
    parts.push("");
  }

  if (runState?.running) {
    parts.push("---");
    parts.push("### ⏳ Running now…");
    parts.push("");
  } else if (lastRun) {
    parts.push("---");
    const icon = lastRun.success ? "✅" : "❌";
    const status = lastRun.success
      ? "Success"
      : `Failed (exit ${lastRun.exitCode})`;
    parts.push(`### ${icon} Last Run — ${status}`);
    parts.push(
      `_${formatAbsolute(new Date(lastRun.startedAt))} · took ${formatDuration(lastRun.durationMs)}_`,
    );
    parts.push("");

    if (lastRun.stdout.trim()) {
      parts.push("**stdout**");
      parts.push("```");
      parts.push(truncate(lastRun.stdout.trim(), 1500));
      parts.push("```");
      parts.push("");
    }
    if (lastRun.stderr.trim()) {
      parts.push("**stderr**");
      parts.push("```");
      parts.push(truncate(lastRun.stderr.trim(), 1500));
      parts.push("```");
      parts.push("");
    }
    if (!lastRun.stdout.trim() && !lastRun.stderr.trim()) {
      parts.push("_No output._");
      parts.push("");
    }

    const total = runState?.totalRuns ?? 1;
    const failures = runState?.failureCount ?? 0;
    if (total > 1) {
      parts.push(
        `_${total} total runs · ${failures} failure${failures !== 1 ? "s" : ""} · Press **⌘L** for full history_`,
      );
    }
  } else {
    parts.push("---");
    parts.push("_No run history yet. Press **⌘.** to run this job now._");
  }

  return parts.join("\n");
}

function formatNextRun(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "< 1m";
  if (diffMin < 60) return `in ${diffMin}m`;
  if (diffHr < 24) return `in ${diffHr}h ${diffMin % 60}m`;
  if (diffDay === 1) return "tomorrow";
  if (diffDay < 7) return `in ${diffDay}d`;
  return formatAbsolute(date);
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return (
    s.slice(0, max) +
    `\n… (${s.length - max} more chars — open logs for full output)`
  );
}
