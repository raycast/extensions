import { randomUUID } from "node:crypto";
import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { callCapability, probeCapability } from "../lib/api";
import { formatProbeQuote, probeError } from "../lib/format";
import { parseJsonObject, stringify } from "../lib/json";
import type { ToolInfo } from "../lib/types";
import { ExecutionResult } from "./execution-result";

interface FormValues {
  parameters: string;
}

export function ExecuteCapabilityForm({ tool, searchId }: { tool: ToolInfo; searchId: string }) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const defaultParameters = stringify(tool.examples?.sample_parameters ?? {});

  async function handleSubmit(values: FormValues) {
    let parameters: Record<string, unknown>;
    try {
      parameters = parseJsonObject(values.parameters);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Parameters",
        message: error instanceof Error ? error.message : "Enter a JSON object.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const probe = await probeCapability({ toolId: tool.tool_id, parameters });
      const validationError = probeError(probe);
      if (validationError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Parameters Failed Validation",
          message: validationError,
        });
        return;
      }

      const confirmed = await confirmAlert({
        title: `Run ${tool.name ?? tool.tool_id}?`,
        message:
          "This capability may consume QVeris credits and may cause side effects in a third-party service. Review the parameters before continuing.",
        primaryAction: { title: "Run Capability", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel" },
      });
      if (!confirmed) return;

      await showToast({ style: Toast.Style.Animated, title: "Running Capability", message: formatProbeQuote(probe) });
      const response = await callCapability({
        toolId: tool.tool_id,
        searchId,
        parameters,
        sessionId: randomUUID(),
      });
      push(<ExecutionResult response={response} />);
      await showToast({
        style: response.success ? Toast.Style.Success : Toast.Style.Failure,
        title: response.success ? "Capability Completed" : "Capability Failed",
        message: response.error_message ?? response.execution_id,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "QVeris Request Failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={tool.name ?? "Run Capability"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review and Run…" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Tool ID" text={tool.tool_id} />
      <Form.Description
        title="Cost"
        text={tool.expected_cost ? String(tool.expected_cost) : "Checked before execution"}
      />
      <Form.TextArea
        id="parameters"
        title="Parameters"
        placeholder={'{\n  "parameter": "value"\n}'}
        defaultValue={defaultParameters}
        info="Enter a JSON object matching the current capability schema. Parameters are validated before execution."
      />
    </Form>
  );
}
