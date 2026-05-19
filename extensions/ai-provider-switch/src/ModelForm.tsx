import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Model, Abilities } from "./types";
import { ABILITY_TEMPLATES, DEFAULT_CONTEXT } from "./constants";

interface ModelFormProps {
  model?: Model;
  existingIds?: string[];
  apiKeyNames?: string[];
  isDuplicate?: boolean;
  onSave: (model: Model) => boolean | Promise<boolean>;
}

function detectTemplate(abilities?: Abilities): string {
  if (!abilities) return "basic";
  for (const [key, tmpl] of Object.entries(ABILITY_TEMPLATES)) {
    const match = Object.keys(tmpl.abilities).every((k) => {
      const ak = k as keyof Abilities;
      return (
        (abilities[ak]?.supported ?? false) ===
        (tmpl.abilities[ak]?.supported ?? false)
      );
    });
    if (match) return key;
  }
  return "custom";
}

export default function ModelForm({
  model,
  existingIds = [],
  apiKeyNames = [],
  isDuplicate = false,
  onSave,
}: ModelFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!model && !isDuplicate;

  const [id, setId] = useState(model?.id || "");
  const [name, setName] = useState(model?.name || "");
  const [modelProvider, setModelProvider] = useState(model?.provider || "");
  const [description, setDescription] = useState(model?.description || "");
  const [context, setContext] = useState(
    String(model?.context || DEFAULT_CONTEXT),
  );

  const [template, setTemplate] = useState(detectTemplate(model?.abilities));
  const [temperature, setTemperature] = useState(
    model?.abilities?.temperature?.supported ?? true,
  );
  const [vision, setVision] = useState(
    model?.abilities?.vision?.supported ?? false,
  );
  const [systemMessage, setSystemMessage] = useState(
    model?.abilities?.system_message?.supported ?? true,
  );
  const [tools, setTools] = useState(
    model?.abilities?.tools?.supported ?? false,
  );
  const [reasoningEffort, setReasoningEffort] = useState(
    model?.abilities?.reasoning_effort?.supported ?? false,
  );

  const [idError, setIdError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [contextError, setContextError] = useState<string | undefined>();

  function applyTemplate(key: string) {
    setTemplate(key);
    if (key === "custom") return;
    const tmpl = ABILITY_TEMPLATES[key];
    if (!tmpl) return;
    setTemperature(tmpl.abilities.temperature?.supported ?? false);
    setVision(tmpl.abilities.vision?.supported ?? false);
    setSystemMessage(tmpl.abilities.system_message?.supported ?? false);
    setTools(tmpl.abilities.tools?.supported ?? false);
    setReasoningEffort(tmpl.abilities.reasoning_effort?.supported ?? false);
  }

  async function handleSubmit() {
    const normalizedId = id.trim();
    const idErr = normalizedId
      ? existingIds.includes(normalizedId)
        ? "ID already exists"
        : undefined
      : "ID is required";
    const nameErr = name.trim() ? undefined : "Name is required";
    const ctxNum = Number(context);
    const ctxErr =
      !Number.isInteger(ctxNum) || ctxNum <= 0
        ? "Must be a positive integer"
        : undefined;

    setIdError(idErr);
    setNameError(nameErr);
    setContextError(ctxErr);

    if (idErr || nameErr || ctxErr) return;

    const result: Model = {
      id: normalizedId,
      name: name.trim(),
      context: ctxNum,
      abilities: {
        temperature: { supported: temperature },
        vision: { supported: vision },
        system_message: { supported: systemMessage },
        tools: { supported: tools },
        reasoning_effort: { supported: reasoningEffort },
      },
    };

    if (modelProvider.trim()) result.provider = modelProvider.trim();
    if (description.trim()) result.description = description.trim();

    const saved = await onSave(result);
    if (!saved) return;

    showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Model Updated" : "Model Added",
    });
    pop();
  }

  return (
    <Form
      navigationTitle={
        isEditing
          ? `Edit ${model!.name}`
          : isDuplicate
            ? `Duplicate ${model!.name}`
            : "Add Model"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              isEditing
                ? "Save Changes"
                : isDuplicate
                  ? "Create Model"
                  : "Add Model"
            }
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="id"
        title="Model ID"
        placeholder="e.g. gpt-4o-mini"
        value={id}
        onChange={(v) => {
          setId(v);
          setIdError(undefined);
        }}
        error={idError}
      />
      <Form.TextField
        id="name"
        title="Display Name"
        placeholder="e.g. GPT-4o Mini"
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
      />
      {apiKeyNames.length > 0 ? (
        <Form.Dropdown
          id="provider"
          title="API Key Mapping"
          value={modelProvider}
          onChange={setModelProvider}
        >
          <Form.Dropdown.Item value="" title="(None)" />
          {apiKeyNames.map((k) => (
            <Form.Dropdown.Item key={k} value={k} title={k} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="provider"
          title="Provider"
          placeholder="(optional) maps to api_keys key"
          value={modelProvider}
          onChange={setModelProvider}
        />
      )}
      <Form.TextField
        id="description"
        title="Description"
        placeholder="(optional)"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="context"
        title="Context Window"
        placeholder="e.g. 128000"
        value={context}
        onChange={(v) => {
          setContext(v);
          setContextError(undefined);
        }}
        error={contextError}
      />

      <Form.Separator />
      <Form.Dropdown
        id="template"
        title="Ability Template"
        value={template}
        onChange={applyTemplate}
      >
        {Object.entries(ABILITY_TEMPLATES).map(([key, tmpl]) => (
          <Form.Dropdown.Item key={key} value={key} title={tmpl.label} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      <Form.Checkbox
        id="temperature"
        label="Temperature"
        value={temperature}
        onChange={(v) => {
          setTemperature(v);
          setTemplate("custom");
        }}
      />
      <Form.Checkbox
        id="vision"
        label="Vision"
        value={vision}
        onChange={(v) => {
          setVision(v);
          setTemplate("custom");
        }}
      />
      <Form.Checkbox
        id="system_message"
        label="System Message"
        value={systemMessage}
        onChange={(v) => {
          setSystemMessage(v);
          setTemplate("custom");
        }}
      />
      <Form.Checkbox
        id="tools"
        label="Tools"
        value={tools}
        onChange={(v) => {
          setTools(v);
          setTemplate("custom");
        }}
      />
      <Form.Checkbox
        id="reasoning_effort"
        label="Reasoning Effort"
        value={reasoningEffort}
        onChange={(v) => {
          setReasoningEffort(v);
          setTemplate("custom");
        }}
      />
    </Form>
  );
}
