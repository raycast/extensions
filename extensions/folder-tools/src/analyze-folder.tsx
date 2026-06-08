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

function isLongWorkflow(workflow: Workflow): boolean {
  return Boolean(
    workflows.find((candidate) => candidate.value === workflow)?.longRunning,
  );
}

export default function Command(props: { draftValues?: Values }) {
  const { push } = useNavigation();
  const p = prefs();
  const draft = props.draftValues;

  async function handleSubmit(values: Values) {
    const target = (values.target || "").trim();
    if (!target) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Falta directorio objetivo",
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
            title="Ejecutar"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Directorio"
        placeholder="/Users/dalonsogomez/Developer/mi-proyecto"
        defaultValue={draft?.target ?? p.defaultTarget}
      />
      <Form.Dropdown
        id="workflow"
        title="Flujo"
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
        title="Modo"
        defaultValue={draft?.mode ?? "auto"}
      >
        <Form.Dropdown.Item
          value="auto"
          title="Auto: Raycast si es rapido, Terminal si es largo"
          icon={Icon.Bolt}
        />
        <Form.Dropdown.Item
          value="raycast"
          title="Raycast: capturar salida"
          icon={Icon.Window}
        />
        <Form.Dropdown.Item
          value="terminal"
          title="Terminal: proceso interactivo o largo"
          icon={Icon.Terminal}
        />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="question"
        title="Pregunta"
        placeholder="Resume esta carpeta y dime que debo revisar primero."
        defaultValue={draft?.question}
      />
      <Form.TextField
        id="topic"
        title="Topic Brain"
        placeholder="Analizar carpeta"
        defaultValue={draft?.topic}
      />
      <Form.Dropdown
        id="budget"
        title="Budget Brain"
        defaultValue={draft?.budget ?? "normal"}
      >
        <Form.Dropdown.Item value="fast" title="fast" />
        <Form.Dropdown.Item value="normal" title="normal" />
        <Form.Dropdown.Item value="deep" title="deep" />
        <Form.Dropdown.Item value="cavernicola" title="cavernicola" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox
        id="openResult"
        title="Opciones"
        label="Abrir HTML/URLs cuando proceda"
        defaultValue={draft?.openResult}
      />
      <Form.Checkbox
        id="dryRun"
        label="Dry run si el flujo lo soporta"
        defaultValue={draft?.dryRun}
      />
    </Form>
  );
}
