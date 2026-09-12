import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getScheduleDetails, showConnectionError } from "../lib/temporal-client";
import { formatDateTime, formatRelativeTime } from "../lib/utils";

interface ScheduleDetailsProps {
  scheduleId: string;
}

export default function ScheduleDetails({ scheduleId }: ScheduleDetailsProps) {
  const { data, isLoading, error } = useCachedPromise(
    async (id: string) => {
      return getScheduleDetails(id);
    },
    [scheduleId],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  if (error && !data) {
    return (
      <Detail
        markdown={`# Error Loading Schedule\n\n${error.message}\n\nPlease check your Temporal connection settings.`}
      />
    );
  }

  const markdown = data ? formatScheduleMarkdown(scheduleId, data) : "Loading schedule details...";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Schedule: ${scheduleId}`}
      markdown={markdown}
      metadata={data ? <ScheduleMetadata scheduleId={scheduleId} data={data} /> : undefined}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Schedule Id" content={scheduleId} />
          {data?.spec && (
            <Action.CopyToClipboard title="Copy Spec as JSON" content={JSON.stringify(data.spec, null, 2)} />
          )}
        </ActionPanel>
      }
    />
  );
}

interface ScheduleData {
  schedule: {
    scheduleId: string;
    isPaused: boolean;
    numActions: number;
    numActionsSkipped: number;
    nextActionTimes: Date[];
    recentActions: Array<{
      scheduledAt: Date;
      startedAt: Date;
      workflowId?: string;
      runId?: string;
    }>;
    createdAt?: Date;
    updatedAt?: Date;
  };
  workflowType?: string;
  taskQueue?: string;
  spec?: Record<string, unknown>;
}

function formatScheduleMarkdown(scheduleId: string, data: ScheduleData): string {
  const lines: string[] = [];

  lines.push(`# ${scheduleId}`);
  lines.push("");

  lines.push(`**Status:** ${data.schedule.isPaused ? "Paused" : "Active"}`);
  lines.push("");

  if (data.workflowType) {
    lines.push(`**Workflow Type:** \`${data.workflowType}\``);
    lines.push("");
  }

  if (data.taskQueue) {
    lines.push(`**Task Queue:** \`${data.taskQueue}\``);
    lines.push("");
  }

  lines.push(`**Total Runs:** ${data.schedule.numActions}`);
  if (data.schedule.numActionsSkipped > 0) {
    lines.push(`**Skipped:** ${data.schedule.numActionsSkipped}`);
  }
  lines.push("");

  // Next runs
  if (data.schedule.nextActionTimes.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Upcoming Runs");
    lines.push("");
    for (const time of data.schedule.nextActionTimes.slice(0, 5)) {
      lines.push(`- ${formatDateTime(time)} (${formatRelativeTime(time)})`);
    }
    lines.push("");
  }

  // Recent actions
  if (data.schedule.recentActions.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Recent Runs");
    lines.push("");
    for (const action of data.schedule.recentActions.slice(0, 5)) {
      const workflowLink = action.workflowId ? ` → \`${action.workflowId}\`` : "";
      lines.push(`- ${formatDateTime(action.startedAt)}${workflowLink}`);
    }
    lines.push("");
  }

  // Spec
  if (data.spec && Object.keys(data.spec).length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Schedule Spec");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(data.spec, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function ScheduleMetadata({ scheduleId, data }: { scheduleId: string; data: ScheduleData }) {
  const nextRun = data.schedule.nextActionTimes[0];

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={data.schedule.isPaused ? "Paused" : "Active"}
          color={data.schedule.isPaused ? "orange" : "green"}
          icon={data.schedule.isPaused ? Icon.Pause : Icon.Play}
        />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Schedule ID" text={scheduleId} />
      {data.workflowType && <Detail.Metadata.Label title="Workflow Type" text={data.workflowType} />}
      {data.taskQueue && <Detail.Metadata.Label title="Task Queue" text={data.taskQueue} />}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Total Runs" text={String(data.schedule.numActions)} />
      <Detail.Metadata.Label title="Skipped" text={String(data.schedule.numActionsSkipped)} />

      {nextRun && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Next Run" text={formatDateTime(nextRun)} />
        </>
      )}

      {data.schedule.createdAt && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatDateTime(data.schedule.createdAt)} />
        </>
      )}
    </Detail.Metadata>
  );
}
