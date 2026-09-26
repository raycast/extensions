import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import spawnSubAgent, { type ForkResult } from "./tools/spawn_sub_agent";
type Values = { prompt: string; delegationReason?: string; model?: string };
export default function Command() {
  const [result, setResult] = useState<ForkResult>();
  const [running, setRunning] = useState(false);
  async function submit(values: Values) {
    setRunning(true);
    try {
      const execution = await spawnSubAgent({
        prompt: values.prompt,
        delegationReason: values.delegationReason,
        model: values.model,
        delegatedObjective: values.prompt,
      });
      setResult(execution);
      await showToast({
        style:
          execution.executionStatus === "completed" ? Toast.Style.Success : Toast.Style.Failure,
        title:
          execution.executionStatus === "completed"
            ? "Subagent returned"
            : "Subagent did not complete",
        message: execution.error,
      });
    } finally {
      setRunning(false);
    }
  }
  if (result) {
    const markdown = [
      "# Agent Fork Result",
      `**Status:** ${result.executionStatus}`,
      `**Phase:** ${result.executionPhase}`,
      `**Model:** ${result.model}`,
      `**Child execution:** \`${result.envelope.childExecutionId}\``,
      `**Parent execution:** \`${result.envelope.parentExecutionId}\``,
      `**Evidence SHA-256:** \`${result.evidence.outputSha256}\``,
      "",
      "## Child Output",
      result.childOutput || result.error || "No output returned.",
    ].join("\n\n");
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Fork Another Agent"
              icon={Icon.ArrowLeft}
              onAction={() => setResult(undefined)}
            />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <Form
      isLoading={running}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Spawn Subagent" icon={Icon.Person} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Task"
        placeholder="Describe the bounded task for the child agent"
      />
      <Form.TextField
        id="delegationReason"
        title="Delegation Reason"
        placeholder="Why delegate this task?"
      />
      <Form.TextField
        id="model"
        title="Model Override"
        placeholder="Leave empty to use the extension default"
      />
    </Form>
  );
}
