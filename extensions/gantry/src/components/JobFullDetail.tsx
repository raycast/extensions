import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import type { LaunchJob } from "../lib/types";
import { useJobDetail } from "../hooks/useJobDetail";
import { runService } from "../lib/data/run-service";
import { formatRelativeTime } from "../lib/utils/format";
import { ScheduleEditorForm } from "./ScheduleEditorForm";
import { LogDetailView } from "./LogDetailView";
import { LiveTailView } from "./LiveTailView";

interface JobFullDetailProps {
  job: LaunchJob;
  onRefresh?: () => void;
}

export function JobFullDetail({ job, onRefresh }: JobFullDetailProps) {
  const { printInfo, logContent, summary, isLoading, revalidate } =
    useJobDetail(job);

  const markdown = buildFullMarkdown(job, printInfo, logContent, summary);

  async function handleRunJob() {
    const confirmed = await confirmAlert({
      title: `Run ${job.label}?`,
      message: "This will trigger the job immediately via launchctl kickstart.",
      primaryAction: { title: "Run" },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running job...",
    });
    try {
      await runService(job.label);
      toast.style = Toast.Style.Success;
      toast.title = "Job triggered";
      toast.message = job.label;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to run job";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={job.health}
              color={
                job.health === "healthy"
                  ? Color.Green
                  : job.health === "error"
                    ? Color.Red
                    : job.health === "warning"
                      ? Color.Yellow
                      : Color.SecondaryText
              }
            />
            {job.isRunning && (
              <Detail.Metadata.TagList.Item
                text="Running"
                color={Color.Green}
              />
            )}
            <Detail.Metadata.TagList.Item
              text={job.source}
              color={Color.Blue}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Label" text={job.label} />
          <Detail.Metadata.Label title="Program" text={job.programFull} />
          {job.pid && (
            <Detail.Metadata.Label title="PID" text={String(job.pid)} />
          )}
          <Detail.Metadata.Label title="Exit Code" text={job.exitCodeMeaning} />
          {printInfo && (
            <>
              <Detail.Metadata.Label title="State" text={printInfo.state} />
              <Detail.Metadata.Label
                title="Total Runs"
                text={String(printInfo.runs)}
              />
            </>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Schedule"
            text={job.schedule.humanReadable}
          />
          {job.schedule.nextRun && (
            <Detail.Metadata.Label
              title="Next Run"
              text={`${formatRelativeTime(job.schedule.nextRun)} (${job.schedule.nextRun.toLocaleString()})`}
            />
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Plist" text={job.plistPath} />
          {job.logPaths.stdout && (
            <Detail.Metadata.Label
              title="Stdout Log"
              text={job.logPaths.stdout}
            />
          )}
          {job.logPaths.stderr && (
            <Detail.Metadata.Label
              title="Stderr Log"
              text={job.logPaths.stderr}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Run Job Now"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={handleRunJob}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {job.source === "user" && (
              <Action.Push
                title="Edit Schedule"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<ScheduleEditorForm job={job} onRefresh={onRefresh} />}
              />
            )}
            <Action.Push
              title="View Logs"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={<LogDetailView job={job} />}
            />
            <Action.Push
              title="Live Tail"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              target={<LiveTailView job={job} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Label"
              content={job.label}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Plist Path"
              content={job.plistPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.Open
              title="Open Plist in Editor"
              target={job.plistPath}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => {
                revalidate();
                onRefresh?.();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildFullMarkdown(
  job: LaunchJob,
  printInfo: import("../lib/types").PrintInfo | null,
  logContent: string | null,
  summary: string | null,
): string {
  const parts: string[] = [];

  parts.push(`# ${job.label}`);
  parts.push(`**Program:** \`${job.programFull}\``);

  if (printInfo?.arguments && printInfo.arguments.length > 0) {
    parts.push("**Arguments:**");
    parts.push("```");
    parts.push(printInfo.arguments.join("\n"));
    parts.push("```");
  }

  parts.push(`**Schedule:** ${job.schedule.humanReadable}`);

  if (summary) {
    parts.push("---");
    parts.push("## AI Summary");
    parts.push(summary);
  }

  if (logContent) {
    parts.push("---");
    parts.push("## Recent Logs");
    parts.push("```");
    parts.push(logContent);
    parts.push("```");
  }

  return parts.join("\n\n");
}
