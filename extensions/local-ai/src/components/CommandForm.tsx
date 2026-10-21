import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { useCommands } from "../hooks/useCommands";
import type { Creativity, Guardrails, UseCase } from "../lib/fm/args";
import { createCommand, updateCommand, validateCommandFields } from "../lib/commands/operations";
import { DEFAULT_ICON, type AiCommand, type CommandFields, type OutputMode } from "../lib/commands/types";
import { parsePrompt } from "../lib/placeholders";
import { getModels } from "../services/models";
import { getSettings } from "../services/settings";

const ICON_NAMES = Object.keys(Icon);
const PLACEHOLDER_INFO =
  'Placeholders: {selection} {clipboard} {date} {time} {argument name="x" default="y" options="a, b"}';

interface FormValues {
  name: string;
  icon: string;
  prompt: string;
  output: string;
  model: string;
  creativity: string;
  useCase: string;
  guardrails: string;
}

export function CommandForm(props: { command?: AiCommand; onSaved?: (command: AiCommand) => void }) {
  const { command } = props;
  const { pop } = useNavigation();
  const { mutate } = useCommands();
  const { data: models = [] } = usePromise(getModels);
  const [settings] = useState(getSettings);
  const [prompt, setPrompt] = useState(command?.prompt ?? "");
  const [model, setModel] = useState(command?.model ?? settings.defaultModel);
  const [errors, setErrors] = useState<{ name?: string; prompt?: string }>({});

  const modelMissing = models.length > 0 && !models.includes(model);
  const modelChoices = modelMissing || models.length === 0 ? [model, ...models] : models;
  const unsupported = parsePrompt(prompt).unsupported;

  async function submit(values: FormValues) {
    const fields: CommandFields = {
      name: values.name,
      icon: values.icon,
      prompt: values.prompt,
      output: values.output as OutputMode,
      model: values.model,
      creativity: values.creativity as Creativity,
      useCase: values.useCase as UseCase,
      guardrails: values.guardrails as Guardrails,
    };
    const problems = validateCommandFields(fields);
    if (problems.length > 0) {
      setErrors({
        name: problems.find((problem) => problem.startsWith("Name")),
        prompt: problems.find((problem) => !problem.startsWith("Name")),
      });
      return;
    }

    const now = new Date().toISOString();
    const saved = command
      ? updateCommand(command, { ...fields, name: fields.name.trim() }, now)
      : createCommand(fields, { id: crypto.randomUUID(), now });
    const ok = await mutate((current) =>
      command ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved],
    );
    if (!ok) return;
    await showToast({ style: Toast.Style.Success, title: command ? "Command saved" : "Command created" });
    props.onSaved?.(saved);
    pop();
  }

  return (
    <Form
      navigationTitle={command ? "Edit Command" : "Create Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={command ? "Save Command" : "Create Command"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={command?.name}
        error={errors.name}
        onChange={() => setErrors((current) => ({ ...current, name: undefined }))}
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={command?.icon ?? DEFAULT_ICON}>
        {ICON_NAMES.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={Icon[name as keyof typeof Icon]} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Prompt"
        info={PLACEHOLDER_INFO}
        value={prompt}
        error={errors.prompt}
        onChange={(value) => {
          setPrompt(value);
          setErrors((current) => ({ ...current, prompt: undefined }));
        }}
      />
      {unsupported.length > 0 && (
        <Form.Description
          title="Warning"
          text={`Unsupported placeholders are sent as plain text: ${unsupported.join(" ")}`}
        />
      )}
      <Form.Dropdown id="output" title="Output" defaultValue={command?.output ?? "replace"}>
        <Form.Dropdown.Item value="replace" title="Replace Selection" />
        <Form.Dropdown.Item value="window" title="Show in Window" />
      </Form.Dropdown>
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        onChange={setModel}
        error={modelMissing ? "This model is not available on this Mac" : undefined}
      >
        {modelChoices.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="creativity"
        title="Creativity"
        defaultValue={command?.creativity ?? settings.defaultCreativity}
      >
        <Form.Dropdown.Item value="normal" title="Normal" />
        <Form.Dropdown.Item value="precise" title="Precise" />
      </Form.Dropdown>
      <Form.Dropdown id="useCase" title="Use Case" defaultValue={command?.useCase ?? "general"}>
        <Form.Dropdown.Item value="general" title="General" />
        <Form.Dropdown.Item value="content-tagging" title="Content Tagging" />
      </Form.Dropdown>
      <Form.Dropdown id="guardrails" title="Guardrails" defaultValue={command?.guardrails ?? "permissive"}>
        <Form.Dropdown.Item value="permissive" title="Permissive" />
        <Form.Dropdown.Item value="default" title="Default" />
      </Form.Dropdown>
    </Form>
  );
}
