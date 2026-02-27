import { List, Color } from "@raycast/api";
import type { LaunchJob } from "../lib/types";
import { useJobDetail } from "../hooks/useJobDetail";
import { formatRelativeTime } from "../lib/utils/format";

export function JobDetailPanel({ job }: { job: LaunchJob }) {
  const { printInfo, logContent, summary, isLoading } = useJobDetail(job);

  const markdown = buildMarkdown(job, logContent, summary);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Health"
            text={{
              value: job.health,
              color:
                job.health === "healthy"
                  ? Color.Green
                  : job.health === "error"
                    ? Color.Red
                    : job.health === "warning"
                      ? Color.Yellow
                      : Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Running"
            text={job.isRunning ? `Yes (PID ${job.pid})` : "No"}
          />
          <List.Item.Detail.Metadata.Label
            title="Exit Code"
            text={{
              value: job.exitCodeMeaning,
              color:
                job.lastExitCode === 0
                  ? Color.Green
                  : job.lastExitCode === null
                    ? Color.SecondaryText
                    : Color.Red,
            }}
          />
          {printInfo && (
            <>
              <List.Item.Detail.Metadata.Label
                title="State"
                text={printInfo.state}
              />
              <List.Item.Detail.Metadata.Label
                title="Total Runs"
                text={String(printInfo.runs)}
              />
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Schedule"
            text={job.schedule.humanReadable}
          />
          {job.schedule.nextRun && (
            <List.Item.Detail.Metadata.Label
              title="Next Run"
              text={formatRelativeTime(job.schedule.nextRun)}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Source" text={job.source} />
          <List.Item.Detail.Metadata.Label
            title="Program"
            text={job.programFull}
          />
          <List.Item.Detail.Metadata.Label title="Plist" text={job.plistPath} />
          {job.logPaths.stdout && (
            <List.Item.Detail.Metadata.Label
              title="Stdout"
              text={job.logPaths.stdout}
            />
          )}
          {job.logPaths.stderr && (
            <List.Item.Detail.Metadata.Label
              title="Stderr"
              text={job.logPaths.stderr}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function buildMarkdown(
  job: LaunchJob,
  logContent: string | null,
  summary: string | null,
): string {
  const parts: string[] = [];

  parts.push(`## ${job.label}`);

  if (summary) {
    parts.push("### AI Summary");
    parts.push(summary);
  }

  if (logContent) {
    parts.push("### Recent Logs");
    parts.push("```");
    parts.push(logContent);
    parts.push("```");
  } else {
    const logPath = job.logPaths.stdout ?? job.logPaths.stderr;
    if (logPath) {
      parts.push("*No log content available*");
    } else {
      parts.push("*No log file configured*");
    }
  }

  return parts.join("\n\n");
}
