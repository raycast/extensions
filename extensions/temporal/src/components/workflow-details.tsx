import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getWorkflowDetails, showConnectionError } from "../lib/temporal-client";
import { WorkflowInfo } from "../lib/types";
import {
  formatDateTime,
  formatDuration,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  buildTemporalUiUrl,
} from "../lib/utils";
import WorkflowActions from "./workflow-actions";

interface WorkflowDetailsProps {
  workflowId: string;
  runId?: string;
}

export default function WorkflowDetails({ workflowId, runId }: WorkflowDetailsProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (wfId: string, rId?: string) => {
      return getWorkflowDetails(wfId, rId);
    },
    [workflowId, runId],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  const workflow = data;

  if (error && !workflow) {
    return (
      <Detail
        markdown={`# Error Loading Workflow\n\n${error.message}\n\nPlease check your Temporal connection settings.`}
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={workflow ? formatWorkflowMarkdown(workflow) : "Loading workflow details..."}
      metadata={workflow ? <WorkflowMetadata workflow={workflow} /> : undefined}
      actions={
        workflow ? <WorkflowActions workflow={workflow} onRefresh={revalidate} showViewDetails={false} /> : undefined
      }
    />
  );
}

function formatWorkflowMarkdown(workflow: WorkflowInfo): string {
  const lines: string[] = [];

  lines.push(`# ${workflow.type}`);
  lines.push("");
  lines.push(`**Workflow ID:** \`${workflow.workflowId}\``);
  lines.push("");

  const statusLabel = getStatusLabel(workflow.status);
  lines.push(`**Status:** ${statusLabel}`);
  lines.push("");

  // Duration
  const endTime = workflow.closeTime || new Date();
  const durationMs = endTime.getTime() - workflow.startTime.getTime();
  lines.push(`**Duration:** ${formatDuration(durationMs)}`);
  lines.push("");

  // Task Queue
  lines.push(`**Task Queue:** \`${workflow.taskQueue}\``);
  lines.push("");

  // Parent workflow if exists
  if (workflow.parentWorkflowId) {
    lines.push("---");
    lines.push("");
    lines.push("## Parent Workflow");
    lines.push("");
    lines.push(`**Workflow ID:** \`${workflow.parentWorkflowId}\``);
    if (workflow.parentRunId) {
      lines.push(`**Run ID:** \`${workflow.parentRunId}\``);
    }
    lines.push("");
  }

  // Memo if exists
  if (workflow.memo && Object.keys(workflow.memo).length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Memo");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(workflow.memo, null, 2));
    lines.push("```");
    lines.push("");
  }

  // Search Attributes if exists
  if (workflow.searchAttributes && Object.keys(workflow.searchAttributes).length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Search Attributes");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(workflow.searchAttributes, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function WorkflowMetadata({ workflow }: { workflow: WorkflowInfo }) {
  const statusIcon = getStatusIcon(workflow.status);
  const statusColor = getStatusColor(workflow.status);
  const statusLabel = getStatusLabel(workflow.status);
  const temporalUiUrl = buildTemporalUiUrl(workflow.workflowId, workflow.runId);

  // Calculate duration
  const endTime = workflow.closeTime || new Date();
  const durationMs = endTime.getTime() - workflow.startTime.getTime();

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={statusLabel} color={statusColor} icon={statusIcon} />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Workflow ID" text={workflow.workflowId} />
      <Detail.Metadata.Label title="Run ID" text={workflow.runId} />
      <Detail.Metadata.Label title="Type" text={workflow.type} />
      <Detail.Metadata.Label title="Task Queue" text={workflow.taskQueue} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Started" text={formatDateTime(workflow.startTime)} />
      {workflow.closeTime && <Detail.Metadata.Label title="Closed" text={formatDateTime(workflow.closeTime)} />}
      <Detail.Metadata.Label title="Duration" text={formatDuration(durationMs)} />

      {workflow.historyLength && <Detail.Metadata.Label title="History Events" text={String(workflow.historyLength)} />}

      {temporalUiUrl && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Temporal UI" target={temporalUiUrl} text="Open in Browser" />
        </>
      )}
    </Detail.Metadata>
  );
}
