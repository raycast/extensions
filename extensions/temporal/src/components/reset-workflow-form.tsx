import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { resetWorkflow, getWorkflowHistory } from "../lib/temporal-client";
import { HistoryEvent } from "../lib/types";

interface ResetWorkflowFormProps {
  workflowId: string;
  runId: string;
}

type ReapplyType = "RESET_REAPPLY_TYPE_SIGNAL" | "RESET_REAPPLY_TYPE_NONE" | "RESET_REAPPLY_TYPE_ALL_ELIGIBLE";

export default function ResetWorkflowForm({ workflowId, runId }: ResetWorkflowFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [reason, setReason] = useState("Reset via Raycast");
  const [reapplyType, setReapplyType] = useState<ReapplyType>("RESET_REAPPLY_TYPE_SIGNAL");

  // Fetch workflow history to get valid reset points
  useEffect(() => {
    async function fetchHistory() {
      try {
        const history = await getWorkflowHistory(workflowId, runId);
        // Filter to only WorkflowTaskCompleted events (valid reset points)
        const resetPoints = history.filter(
          (e) => e.eventType.includes("Workflow Task Completed") || e.eventType.includes("WorkflowTaskCompleted")
        );
        setEvents(resetPoints);
        if (resetPoints.length > 0) {
          // Default to last reset point
          setSelectedEventId(String(resetPoints[resetPoints.length - 1].eventId));
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load History",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [workflowId, runId]);

  const handleSubmit = async () => {
    if (!selectedEventId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Event Required",
        message: "Please select a reset point",
      });
      return;
    }

    if (!reason.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reason Required",
        message: "Please provide a reason for the reset",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Resetting workflow...",
      });

      const result = await resetWorkflow({
        workflowId,
        runId,
        workflowTaskFinishEventId: parseInt(selectedEventId, 10),
        reason,
        resetReapplyType: reapplyType,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Workflow Reset",
        message: `New run ID: ${result.runId.substring(0, 8)}...`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Reset Workflow",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <List isLoading={true} navigationTitle={`Reset: ${workflowId}`} />;
  }

  if (events.length === 0) {
    return (
      <List navigationTitle={`Reset: ${workflowId}`}>
        <List.EmptyView
          title="No Reset Points Found"
          description="This workflow has no completed workflow tasks to reset to."
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Reset: ${workflowId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reset Workflow" icon={Icon.RotateAntiClockwise} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Workflow" text={workflowId} />
      <Form.Description title="Run ID" text={runId} />

      <Form.Separator />

      <Form.Dropdown
        id="eventId"
        title="Reset Point"
        value={selectedEventId}
        onChange={setSelectedEventId}
        info="Select the workflow task to reset to. The workflow will replay from this point."
      >
        {events.map((event) => (
          <Form.Dropdown.Item
            key={event.eventId}
            value={String(event.eventId)}
            title={`Event ${event.eventId} - ${event.eventType}`}
            icon={Icon.Clock}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="reason"
        title="Reason"
        placeholder="Reason for reset"
        value={reason}
        onChange={setReason}
        info="Provide a reason for auditing purposes"
      />

      <Form.Dropdown
        id="reapplyType"
        title="Signal Handling"
        value={reapplyType}
        onChange={(value) => setReapplyType(value as ReapplyType)}
        info="How to handle signals that were received after the reset point"
      >
        <Form.Dropdown.Item value="RESET_REAPPLY_TYPE_SIGNAL" title="Reapply Signals" icon={Icon.Message} />
        <Form.Dropdown.Item value="RESET_REAPPLY_TYPE_ALL_ELIGIBLE" title="Reapply All Eligible" icon={Icon.Layers} />
        <Form.Dropdown.Item value="RESET_REAPPLY_TYPE_NONE" title="Don't Reapply" icon={Icon.XMarkCircle} />
      </Form.Dropdown>
    </Form>
  );
}
