import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  launchCommand,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ChatStats } from "./types";
import { friendlyError, getExtensionPreferences, selectedTextOrClipboard } from "./lib/raycast";
import { preferredModel, useDefaultChatModel, useLMStudioModels } from "./lib/use-models";

const PRESETS_KEY = "transform-text.presets.v1";

type BuiltInOperation = "rewrite" | "summarize" | "grammar" | "explain" | "translate";

type TransformPreset = {
  id: string;
  name: string;
  instruction: string;
};

type TransformValues = {
  text: string;
  model: string;
  operation: string;
  targetLanguage?: string;
};

type TransformResult = {
  text: string;
  reasoning?: string;
  stats: ChatStats;
};

const BUILT_IN_OPERATIONS: Array<{
  id: BuiltInOperation;
  title: string;
  icon: Icon;
}> = [
  { id: "rewrite", title: "Rewrite", icon: Icon.Pencil },
  { id: "summarize", title: "Summarize", icon: Icon.Text },
  { id: "grammar", title: "Fix Grammar", icon: Icon.CheckCircle },
  { id: "explain", title: "Explain Code", icon: Icon.Code },
  { id: "translate", title: "Translate", icon: Icon.Globe },
];

function operationTitle(operation: string, presets: TransformPreset[]) {
  return (
    BUILT_IN_OPERATIONS.find((candidate) => candidate.id === operation)?.title ??
    presets.find((preset) => `preset:${preset.id}` === operation)?.name ??
    "Transform"
  );
}

function transformationPrompt(operation: string, input: string, targetLanguage: string, presets: TransformPreset[]) {
  const instructions: Record<BuiltInOperation, string> = {
    rewrite:
      "Rewrite the text for clarity, flow, and precision while preserving its meaning and tone. Return only the rewritten text.",
    summarize: "Summarize the text concisely while preserving the important facts. Return only the summary.",
    grammar:
      "Correct grammar, spelling, punctuation, and awkward phrasing without changing the meaning. Return only the corrected text.",
    explain:
      "Explain the code clearly. Cover its purpose, important control flow, and any non-obvious behavior. Use concise Markdown.",
    translate: `Translate the text into ${targetLanguage || "English"}. Preserve meaning, tone, names, and formatting. Return only the translation.`,
  };

  const preset = presets.find((candidate) => `preset:${candidate.id}` === operation);
  if (preset) {
    return preset.instruction.includes("{{text}}")
      ? preset.instruction.replaceAll("{{text}}", input)
      : `${preset.instruction}\n\nText:\n${input}`;
  }

  const instruction = instructions[operation as BuiltInOperation];
  if (!instruction) throw new Error("Choose a valid transformation.");
  return `${instruction}\n\nText:\n${input}`;
}

async function readPresets() {
  const stored = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!stored) return [];
  try {
    const value = JSON.parse(stored) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is TransformPreset =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as TransformPreset).id === "string" &&
        typeof (item as TransformPreset).name === "string" &&
        typeof (item as TransformPreset).instruction === "string",
    );
  } catch {
    return [];
  }
}

async function writePresets(presets: TransformPreset[]) {
  await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function TransformResultView(props: {
  initialResult: TransformResult;
  operation: string;
  sourceText: string;
  model: string;
  retry: () => Promise<TransformResult>;
}) {
  const [result, setResult] = useState(props.initialResult);
  const [isLoading, setIsLoading] = useState(false);

  async function retry() {
    setIsLoading(true);
    try {
      setResult(await props.retry());
      await showToast({
        style: Toast.Style.Success,
        title: "Text Regenerated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Regenerate Text",
        message: friendlyError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      navigationTitle={props.operation}
      isLoading={isLoading}
      markdown={result.text || "_LM Studio returned an empty result._"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={props.model} />
          <Detail.Metadata.Label title="Input Tokens" text={String(result.stats.inputTokens)} />
          <Detail.Metadata.Label title="Output Tokens" text={String(result.stats.totalOutputTokens)} />
          <Detail.Metadata.Label title="Tokens per Second" text={result.stats.tokensPerSecond.toFixed(1)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Paste title="Replace Selected Text" icon={Icon.Replace} content={result.text} />
          <Action.CopyToClipboard title="Copy Result" content={result.text} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action
            title="Regenerate Text"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={retry}
          />
          <Action
            title="Continue in Chat"
            icon={Icon.Message}
            onAction={() =>
              launchCommand({
                name: "chat",
                type: LaunchType.UserInitiated,
                context: {
                  prefill: `Source text:\n${props.sourceText}\n\nTransformed text:\n${result.text}\n\nFollow-up: `,
                },
              })
            }
          />
          {result.reasoning ? (
            <Action.Push
              title="View Reasoning"
              icon={Icon.LightBulb}
              target={
                <Detail
                  navigationTitle="Reasoning"
                  markdown={result.reasoning}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Reasoning" content={result.reasoning} />
                    </ActionPanel>
                  }
                />
              }
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function PresetEditor(props: { preset?: TransformPreset; onSave: (preset: TransformPreset) => Promise<void> }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  const [instructionError, setInstructionError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function save(values: { name: string; instruction: string }) {
    const name = values.name.trim();
    const instruction = values.instruction.trim();
    setNameError(name ? undefined : "Enter a preset name.");
    setInstructionError(instruction ? undefined : "Enter an instruction.");
    if (!name || !instruction) return;

    setIsSaving(true);
    try {
      await props.onSave({
        id: props.preset?.id ?? crypto.randomUUID(),
        name,
        instruction,
      });
      await showToast({ style: Toast.Style.Success, title: "Preset Saved" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Preset",
        message: friendlyError(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      navigationTitle={props.preset ? "Edit Preset" : "New Preset"}
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" icon={Icon.Check} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Make More Concise"
        defaultValue={props.preset?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />
      <Form.TextArea
        id="instruction"
        title="Instruction"
        placeholder="Make the following text more concise…"
        defaultValue={props.preset?.instruction}
        error={instructionError}
        onChange={() => setInstructionError(undefined)}
        info="Use {{text}} to place the source text exactly; otherwise it is appended."
      />
    </Form>
  );
}

function PresetList(props: { presets: TransformPreset[]; onChange: (presets: TransformPreset[]) => Promise<void> }) {
  const [presets, setPresets] = useState(props.presets);

  async function savePreset(preset: TransformPreset) {
    const next = presets.some((candidate) => candidate.id === preset.id)
      ? presets.map((candidate) => (candidate.id === preset.id ? preset : candidate))
      : [...presets, preset];
    await props.onChange(next);
    setPresets(next);
  }

  async function deletePreset(preset: TransformPreset) {
    const confirmed = await confirmAlert({
      title: `Delete “${preset.name}”?`,
      message: "This custom transformation preset cannot be recovered.",
      primaryAction: {
        title: "Delete Preset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    const next = presets.filter((candidate) => candidate.id !== preset.id);
    await props.onChange(next);
    setPresets(next);
    await showToast({ style: Toast.Style.Success, title: "Preset Deleted" });
  }

  return (
    <List navigationTitle="Custom Presets">
      {presets.length === 0 ? (
        <List.EmptyView
          icon={Icon.Wand}
          title="No Custom Presets"
          description="Create a reusable instruction for transforming text."
          actions={
            <ActionPanel>
              <Action.Push title="Create Preset" icon={Icon.Plus} target={<PresetEditor onSave={savePreset} />} />
            </ActionPanel>
          }
        />
      ) : (
        presets.map((preset) => (
          <List.Item
            key={preset.id}
            icon={Icon.Wand}
            title={preset.name}
            subtitle={preset.instruction.replace(/\s+/g, " ")}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  target={<PresetEditor preset={preset} onSave={savePreset} />}
                />
                <Action.Push
                  title="Create Preset"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<PresetEditor onSave={savePreset} />}
                />
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deletePreset(preset)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function TransformTextCommand() {
  const { push } = useNavigation();
  const { client, models, isLoading, error, refresh } = useLMStudioModels("llm");
  const { defaultModelKey, isLoadingDefaultModel } = useDefaultChatModel();
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const [operation, setOperation] = useState<string>("rewrite");
  const [presets, setPresets] = useState<TransformPreset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textError, setTextError] = useState<string>();
  const [modelError, setModelError] = useState<string>();

  useEffect(() => {
    let active = true;
    void selectedTextOrClipboard()
      .then((sourceText) => {
        if (!active) return;
        if (sourceText.trim()) setText((current) => current || sourceText);
      })
      .catch(() => undefined);
    void readPresets().then((savedPresets) => {
      if (active) {
        setPresets(savedPresets);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingDefaultModel) return;
    if (!models.some((candidate) => candidate.key === model)) {
      setModel(preferredModel(models, defaultModelKey)?.key ?? "");
    }
  }, [defaultModelKey, isLoadingDefaultModel, model, models]);

  useEffect(() => {
    if (operation.startsWith("preset:") && !presets.some((preset) => `preset:${preset.id}` === operation)) {
      setOperation("rewrite");
    }
  }, [operation, presets]);

  async function savePresets(next: TransformPreset[]) {
    await writePresets(next);
    setPresets(next);
  }

  async function transform(values: TransformValues) {
    const sourceText = values.text.trim();
    setTextError(sourceText ? undefined : "Enter or select text to transform.");
    setModelError(values.model ? undefined : "Choose a language model.");
    if (!sourceText || !values.model) return;

    let prompt: string;
    try {
      prompt = transformationPrompt(values.operation, sourceText, values.targetLanguage?.trim() || "English", presets);
    } catch (caughtError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Transformation",
        message: friendlyError(caughtError),
      });
      return;
    }

    const preferences = getExtensionPreferences();
    const run = async (): Promise<TransformResult> => {
      const result = await client.chat({
        model: values.model,
        input: prompt,
        systemPrompt: preferences.systemPrompt?.trim() || undefined,
        temperature: 0.3,
        maxOutputTokens: 2048,
        store: false,
      });
      return {
        text: result.text,
        reasoning: result.reasoning || undefined,
        stats: result.stats,
      };
    };

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transforming Text…",
    });
    try {
      const result = await run();
      toast.style = Toast.Style.Success;
      toast.title = "Text Ready";
      push(
        <TransformResultView
          initialResult={result}
          operation={operationTitle(values.operation, presets)}
          sourceText={sourceText}
          model={values.model}
          retry={run}
        />,
      );
    } catch (caughtError) {
      toast.style = Toast.Style.Failure;
      toast.title = "LM Studio Request Failed";
      toast.message = friendlyError(caughtError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Transform Text"
      enableDrafts
      isLoading={isLoading || isLoadingDefaultModel || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={operationTitle(operation, presets)} icon={Icon.Wand} onSubmit={transform} />
          <Action.Push
            title="Manage Custom Presets"
            icon={Icon.List}
            target={<PresetList presets={presets} onChange={savePresets} />}
          />
          <Action
            title="Refresh Models"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Select text before opening Raycast, or enter it here…"
        value={text}
        onChange={(value) => {
          setText(value);
          if (value.trim()) setTextError(undefined);
        }}
        error={textError}
        autoFocus
      />
      <Form.Dropdown id="operation" title="Operation" value={operation} onChange={setOperation}>
        <Form.Dropdown.Section title="Built In">
          {BUILT_IN_OPERATIONS.map((candidate) => (
            <Form.Dropdown.Item key={candidate.id} value={candidate.id} title={candidate.title} icon={candidate.icon} />
          ))}
        </Form.Dropdown.Section>
        {presets.length > 0 ? (
          <Form.Dropdown.Section title="Custom Presets">
            {presets.map((preset) => (
              <Form.Dropdown.Item key={preset.id} value={`preset:${preset.id}`} title={preset.name} icon={Icon.Wand} />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
      {operation === "translate" ? (
        <Form.TextField id="targetLanguage" title="Target Language" defaultValue="English" placeholder="English" />
      ) : null}
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        onChange={(value) => {
          setModel(value);
          setModelError(undefined);
        }}
        error={modelError}
      >
        {models.map((candidate) => (
          <Form.Dropdown.Item
            key={candidate.key}
            value={candidate.key}
            title={`${candidate.displayName}${candidate.key === defaultModelKey ? " (Default)" : candidate.loadedInstances.length > 0 ? " (Loaded)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      {error ? <Form.Description title="Connection" text={error} /> : null}
    </Form>
  );
}
