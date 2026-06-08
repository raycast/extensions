import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import {
  ResultDetail,
  isLongWorkflow,
  prefs,
  runWorkflowCapture,
  runWorkflowTerminal,
  workflows,
  type Workflow,
  type WorkflowOptions,
} from "./lib";

type Values = {
  target: string;
  workflow: string;
  question?: string;
  topic?: string;
  budget?: string;
  mode: string;
  openResult?: boolean;
  dryRun?: boolean;
};

export default function Command(props: { draftValues?: Values }) {
  const { push } = useNavigation();
  const p = prefs();
  const draft = props.draftValues;

  async function handleSubmit(values: Values) {
    const target = (values.target || "").trim();
    if (!target) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Target folder is required",
      });
      return;
    }

    const workflow = values.workflow as Workflow;
    const options: WorkflowOptions = {
      question: values.question,
      topic: values.topic,
      budget: values.budget,
      openResult: Boolean(values.openResult),
      dryRun: Boolean(values.dryRun),
    };

    if (values.mode === "terminal" || isLongWorkflow(workflow)) {
      await runWorkflowTerminal(workflow, target, options);
      return;
    }

    const result = await runWorkflowCapture(workflow, target, options);
    push(<ResultDetail result={result} />);
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Folder"
        placeholder="~/Developer/my-project"
        defaultValue={draft?.target ?? p.defaultTarget}
      />
      <Form.Dropdown
        id="workflow"
        title="Workflow"
        defaultValue={draft?.workflow ?? "recommended"}
      >
        {workflows.map((workflow) => (
          <Form.Dropdown.Item
            key={workflow.value}
            value={workflow.value}
            title={workflow.title}
            icon={workflow.longRunning ? Icon.Clock : Icon.Dot}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="mode"
        title="Mode"
        defaultValue={draft?.mode ?? "auto"}
      >
        <Form.Dropdown.Item
          value="auto"
          title="Auto: Raycast for quick runs, terminal for long runs"
          icon={Icon.Bolt}
        />
        <Form.Dropdown.Item
          value="raycast"
          title="Raycast: capture output"
          icon={Icon.Window}
        />
        <Form.Dropdown.Item
          value="terminal"
          title="Terminal: interactive or long-running process"
          icon={Icon.Terminal}
        />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="question"
        title="Question"
        placeholder="Summarize this folder and tell me what to review first."
        defaultValue={draft?.question}
      />
      <Form.TextField
        id="topic"
        title="Brain Topic"
        placeholder="Analyze folder"
        defaultValue={draft?.topic}
      />
      <Form.Dropdown
        id="budget"
        title="Brain Budget"
        defaultValue={draft?.budget ?? "normal"}
      >
        <Form.Dropdown.Item value="fast" title="fast" />
        <Form.Dropdown.Item value="normal" title="normal" />
        <Form.Dropdown.Item value="deep" title="deep" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox
        id="openResult"
        title="Options"
        label="Open HTML or URLs when available"
        defaultValue={draft?.openResult}
      />
      <Form.Checkbox
        id="dryRun"
        label="Dry run when the workflow supports it"
        defaultValue={draft?.dryRun}
      />
    </Form>
  );
}
