import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Detail,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  RunLog,
  getRunLogs,
  clearRunLogs,
  formatDuration,
  formatRelativeTime,
  formatAbsoluteTime,
  jobKey,
} from "./log-store";
import { CronJob } from "./cron-utils";

interface Props {
  job: CronJob;
  onRunNow?: () => void;
}

export function RunLogsView({ job, onRunNow }: Props) {
  const key = jobKey(job.schedule, job.command);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await getRunLogs(key);
    setLogs(loaded);
    setIsLoading(false);
  }, [key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClear = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All Logs?",
      message: "This will permanently delete all run history for this job.",
      primaryAction: {
        title: "Clear Logs",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearRunLogs(key);
    await showToast({ style: Toast.Style.Success, title: "Logs cleared" });
    await refresh();
  };

  const title = job.comment || job.command;
  const successCount = logs.filter((l) => l.success).length;
  const failCount = logs.filter((l) => !l.success).length;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Run History — ${title}`}
      isShowingDetail
      actions={
        <ActionPanel>
          {onRunNow && (
            <Action
              title="Run Now"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRunNow}
            />
          )}
          {logs.length > 0 && (
            <Action
              title="Clear All Logs"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClear}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
        </ActionPanel>
      }
    >
      {!isLoading && logs.length === 0 && (
        <List.EmptyView
          title="No Run History"
          description={
            onRunNow
              ? "Press ⌘R to run this job now and capture its first log"
              : "This job has never been run manually"
          }
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              {onRunNow && (
                <Action title="Run Now" icon={Icon.Play} onAction={onRunNow} />
              )}
            </ActionPanel>
          }
        />
      )}

      {logs.length > 0 && (
        <List.Section
          title="Run History"
          subtitle={`${logs.length} runs · ${successCount} passed · ${failCount} failed`}
        >
          {logs.map((log) => (
            <RunLogItem
              key={log.id}
              log={log}
              onSelect={() => push(<RunLogDetail log={log} />)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Single log row in the list
// ──────────────────────────────────────────────────────────────────────────────

function RunLogItem({ log, onSelect }: { log: RunLog; onSelect: () => void }) {
  return (
    <List.Item
      icon={
        log.success
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      title={formatRelativeTime(log.startedAt)}
      subtitle={log.success ? "Success" : `Failed (exit ${log.exitCode})`}
      accessories={[
        {
          tag: {
            value: log.triggeredBy === "manual" ? "manual" : "cron",
            color:
              log.triggeredBy === "manual" ? Color.Blue : Color.SecondaryText,
          },
        },
        { text: formatDuration(log.durationMs), icon: Icon.Clock },
      ]}
      detail={
        <List.Item.Detail
          markdown={buildLogMarkdown(log)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Result"
                text={
                  log.success ? "Success" : `Failed (exit code ${log.exitCode})`
                }
                icon={
                  log.success
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.XMarkCircle, tintColor: Color.Red }
                }
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Started"
                text={formatAbsoluteTime(log.startedAt)}
              />
              <List.Item.Detail.Metadata.Label
                title="Finished"
                text={formatAbsoluteTime(log.finishedAt)}
              />
              <List.Item.Detail.Metadata.Label
                title="Duration"
                text={formatDuration(log.durationMs)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Exit Code"
                text={String(log.exitCode)}
              />
              <List.Item.Detail.Metadata.Label
                title="Triggered By"
                text={
                  log.triggeredBy === "manual" ? "Manual run" : "Cron schedule"
                }
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="stdout"
                text={
                  log.stdout.trim()
                    ? `${log.stdout.trim().split("\n").length} lines`
                    : "empty"
                }
              />
              <List.Item.Detail.Metadata.Label
                title="stderr"
                text={
                  log.stderr.trim()
                    ? `${log.stderr.trim().split("\n").length} lines`
                    : "empty"
                }
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title="View Full Log" icon={Icon.Eye} onAction={onSelect} />
          <Action.CopyToClipboard
            title="Copy Stdout"
            content={log.stdout || "(empty)"}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {log.stderr && (
            <Action.CopyToClipboard
              title="Copy Stderr"
              content={log.stderr}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Full-screen log detail view
// ──────────────────────────────────────────────────────────────────────────────

function RunLogDetail({ log }: { log: RunLog }) {
  return (
    <Detail
      navigationTitle={`Log — ${formatAbsoluteTime(log.startedAt)}`}
      markdown={buildDetailMarkdown(log)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Full Log"
            content={buildPlainText(log)}
          />
          {log.stdout && (
            <Action.CopyToClipboard
              title="Copy Stdout"
              content={log.stdout}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {log.stderr && (
            <Action.CopyToClipboard
              title="Copy Stderr"
              content={log.stderr}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Result"
            text={log.success ? "✓ Success" : `✗ Failed (exit ${log.exitCode})`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Started"
            text={formatAbsoluteTime(log.startedAt)}
          />
          <Detail.Metadata.Label
            title="Finished"
            text={formatAbsoluteTime(log.finishedAt)}
          />
          <Detail.Metadata.Label
            title="Duration"
            text={formatDuration(log.durationMs)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Exit Code"
            text={String(log.exitCode)}
          />
          <Detail.Metadata.Label
            title="Triggered By"
            text={log.triggeredBy === "manual" ? "Manual run" : "Cron schedule"}
          />
        </Detail.Metadata>
      }
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Markdown builders
// ──────────────────────────────────────────────────────────────────────────────

function buildLogMarkdown(log: RunLog): string {
  const parts: string[] = [];

  const statusLine = log.success
    ? `**✓ Success** · exit 0 · ${formatDuration(log.durationMs)}`
    : `**✗ Failed** · exit ${log.exitCode} · ${formatDuration(log.durationMs)}`;

  parts.push(statusLine);
  parts.push("");

  if (log.stdout.trim()) {
    parts.push("**stdout**");
    parts.push("```");
    parts.push(truncate(log.stdout.trim(), 2000));
    parts.push("```");
  }

  if (log.stderr.trim()) {
    parts.push("**stderr**");
    parts.push("```");
    parts.push(truncate(log.stderr.trim(), 2000));
    parts.push("```");
  }

  if (!log.stdout.trim() && !log.stderr.trim()) {
    parts.push("_No output captured._");
  }

  return parts.join("\n");
}

function buildDetailMarkdown(log: RunLog): string {
  const parts: string[] = [];

  const icon = log.success ? "✅" : "❌";
  parts.push(`## ${icon} Run at ${formatAbsoluteTime(log.startedAt)}`);
  parts.push("");
  parts.push(
    `**Exit code:** \`${log.exitCode}\` · **Duration:** ${formatDuration(log.durationMs)} · **Triggered:** ${log.triggeredBy}`,
  );
  parts.push("");

  if (log.stdout.trim()) {
    parts.push("### stdout");
    parts.push("```");
    parts.push(log.stdout.trim());
    parts.push("```");
    parts.push("");
  }

  if (log.stderr.trim()) {
    parts.push("### stderr");
    parts.push("```");
    parts.push(log.stderr.trim());
    parts.push("```");
    parts.push("");
  }

  if (!log.stdout.trim() && !log.stderr.trim()) {
    parts.push("_No output was captured for this run._");
  }

  return parts.join("\n");
}

function buildPlainText(log: RunLog): string {
  const lines = [
    `Run: ${formatAbsoluteTime(log.startedAt)}`,
    `Exit code: ${log.exitCode}`,
    `Duration: ${formatDuration(log.durationMs)}`,
    `Triggered by: ${log.triggeredBy}`,
    "",
  ];
  if (log.stdout.trim()) {
    lines.push("=== stdout ===");
    lines.push(log.stdout.trim());
    lines.push("");
  }
  if (log.stderr.trim()) {
    lines.push("=== stderr ===");
    lines.push(log.stderr.trim());
  }
  return lines.join("\n");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n… (truncated, ${s.length - max} more chars)`;
}
