import { Action, ActionPanel, Alert, Icon, confirmAlert, showToast, Toast, Keyboard } from "@raycast/api";
import { WorkflowInfo } from "../lib/types";
import { cancelWorkflow, terminateWorkflow } from "../lib/temporal-client";
import { buildTemporalUiUrl } from "../lib/utils";
import {
  getDescribeCommand,
  getCancelCommand,
  getTerminateCommand,
  getSignalCommand,
  getQueryCommand,
  getShowCommand,
} from "../lib/cli-commands";
import WorkflowDetails from "./workflow-details";
import WorkflowHistory from "./workflow-history";
import SignalWorkflowForm from "./signal-form";
import QueryWorkflowForm from "./query-form";
import ResetWorkflowForm from "./reset-workflow-form";

interface WorkflowActionsProps {
  workflow: WorkflowInfo;
  onRefresh: () => void;
  onView?: (workflow: WorkflowInfo) => void;
  showViewDetails?: boolean;
}

export default function WorkflowActions({ workflow, onRefresh, onView, showViewDetails = true }: WorkflowActionsProps) {
  const temporalUiUrl = buildTemporalUiUrl(workflow.workflowId, workflow.runId);
  const isRunning = workflow.status === "RUNNING" || workflow.status === "UNKNOWN";
  const canReset = ["FAILED", "COMPLETED", "CANCELLED", "TERMINATED", "TIMED_OUT"].includes(workflow.status);

  async function handleCancel() {
    const confirmed = await confirmAlert({
      title: "Cancel Workflow",
      message: `Are you sure you want to cancel workflow "${workflow.workflowId}"?\n\nThis sends a cancellation request that the workflow can handle gracefully.`,
      primaryAction: {
        title: "Cancel Workflow",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Cancelling workflow...",
      });

      await cancelWorkflow(workflow.workflowId, workflow.runId);

      await showToast({
        style: Toast.Style.Success,
        title: "Workflow Cancelled",
        message: workflow.workflowId,
      });

      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Cancel",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleTerminate() {
    const confirmed = await confirmAlert({
      title: "Terminate Workflow",
      message: `Are you sure you want to TERMINATE workflow "${workflow.workflowId}"?\n\nThis will immediately stop the workflow without allowing cleanup. This cannot be undone.`,
      primaryAction: {
        title: "Terminate",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Terminating workflow...",
      });

      await terminateWorkflow(workflow.workflowId, "Terminated via Raycast", workflow.runId);

      await showToast({
        style: Toast.Style.Success,
        title: "Workflow Terminated",
        message: workflow.workflowId,
      });

      onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Terminate",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const handleViewDetails = () => {
    if (onView) {
      onView(workflow);
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section title="Workflow">
        {showViewDetails && (
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<WorkflowDetails workflowId={workflow.workflowId} runId={workflow.runId} />}
            onPush={handleViewDetails}
          />
        )}
        <Action.Push
          title="View History"
          icon={Icon.List}
          target={<WorkflowHistory workflowId={workflow.workflowId} runId={workflow.runId} />}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        <Action.CopyToClipboard
          title="Copy Workflow Id"
          content={workflow.workflowId}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Run Id"
          content={workflow.runId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        {temporalUiUrl && (
          <Action.OpenInBrowser
            title="Open in Temporal Ui"
            url={temporalUiUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}
      </ActionPanel.Section>

      {isRunning && (
        <ActionPanel.Section title="Interact">
          <Action.Push
            title="Send Signal"
            icon={Icon.Message}
            target={<SignalWorkflowForm workflowId={workflow.workflowId} runId={workflow.runId} />}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.Push
            title="Query Workflow"
            icon={Icon.QuestionMark}
            target={<QueryWorkflowForm workflowId={workflow.workflowId} runId={workflow.runId} />}
            shortcut={{ modifiers: ["cmd"], key: "q" }}
          />
        </ActionPanel.Section>
      )}

      {canReset && (
        <ActionPanel.Section title="Recovery">
          <Action.Push
            title="Reset Workflow"
            icon={Icon.RotateAntiClockwise}
            target={<ResetWorkflowForm workflowId={workflow.workflowId} runId={workflow.runId} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel.Section>
      )}

      {isRunning && (
        <ActionPanel.Section title="Danger">
          <Action
            title="Cancel Workflow"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={handleCancel}
          />
          <Action
            title="Terminate Workflow"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={handleTerminate}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Copy as CLI">
        <Action.CopyToClipboard
          title="Copy Describe Command"
          content={getDescribeCommand(workflow.workflowId, workflow.runId)}
          icon={Icon.Terminal}
        />
        <Action.CopyToClipboard
          title="Copy Show History Command"
          content={getShowCommand(workflow.workflowId, workflow.runId)}
          icon={Icon.Terminal}
        />
        {isRunning && (
          <>
            <Action.CopyToClipboard
              title="Copy Signal Command"
              content={getSignalCommand(workflow.workflowId, undefined, workflow.runId)}
              icon={Icon.Terminal}
            />
            <Action.CopyToClipboard
              title="Copy Query Command"
              content={getQueryCommand(workflow.workflowId, undefined, workflow.runId)}
              icon={Icon.Terminal}
            />
            <Action.CopyToClipboard
              title="Copy Cancel Command"
              content={getCancelCommand(workflow.workflowId, workflow.runId)}
              icon={Icon.Terminal}
            />
            <Action.CopyToClipboard
              title="Copy Terminate Command"
              content={getTerminateCommand(workflow.workflowId, undefined, workflow.runId)}
              icon={Icon.Terminal}
            />
          </>
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
