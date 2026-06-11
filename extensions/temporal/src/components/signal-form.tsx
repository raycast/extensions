import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { signalWorkflow } from "../lib/temporal-client";

interface SignalWorkflowFormProps {
  workflowId: string;
  runId?: string;
}

export default function SignalWorkflowForm({ workflowId, runId }: SignalWorkflowFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [signalName, setSignalName] = useState("");
  const [payload, setPayload] = useState("");
  const [payloadError, setPayloadError] = useState<string | undefined>();

  const validatePayload = (value: string) => {
    if (!value.trim()) {
      setPayloadError(undefined);
      return true;
    }

    try {
      JSON.parse(value);
      setPayloadError(undefined);
      return true;
    } catch {
      setPayloadError("Invalid JSON");
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!signalName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Signal Name Required",
        message: "Please enter a signal name",
      });
      return;
    }

    if (payload.trim() && !validatePayload(payload)) {
      return;
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Sending signal...",
      });

      let parsedPayload: unknown = undefined;
      if (payload.trim()) {
        parsedPayload = JSON.parse(payload);
      }

      await signalWorkflow(workflowId, signalName, parsedPayload, runId);

      await showToast({
        style: Toast.Style.Success,
        title: "Signal Sent",
        message: `Signal "${signalName}" sent to workflow`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Send Signal",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Signal: ${workflowId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Signal" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Workflow" text={workflowId} />
      {runId && <Form.Description title="Run ID" text={runId} />}

      <Form.Separator />

      <Form.TextField
        id="signalName"
        title="Signal Name"
        placeholder="e.g., approve, cancel, update"
        value={signalName}
        onChange={setSignalName}
        autoFocus
      />

      <Form.TextArea
        id="payload"
        title="Payload (JSON)"
        placeholder='{"key": "value"}'
        value={payload}
        onChange={(value) => {
          setPayload(value);
          if (value.trim()) {
            validatePayload(value);
          } else {
            setPayloadError(undefined);
          }
        }}
        error={payloadError}
        info="Optional JSON payload to send with the signal"
      />
    </Form>
  );
}
