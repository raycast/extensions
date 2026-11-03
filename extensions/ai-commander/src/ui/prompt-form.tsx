import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { findEntry, groupByFamily, parseCustomModel, refKey } from "../catalog/build";
import { routeModel } from "../catalog/routing";
import { getApiKeys } from "../core/preferences";
import type { CreativityLevel, ModelRef, OutputMode, PrivacyOverride, PromptDef, ReasoningLevel } from "../core/types";
import { createPrompt, getDefaultModel, getSnippets, updatePrompt, type PromptDraft } from "../prompts/store";
import { inspectTemplate, validatePromptDraft } from "../prompts/template/validate";
import { supportedReasoning, supportsCreativity } from "../providers";
import { showError } from "./feedback";
import { ICON_CHOICES, iconTitle, LEVEL_ICONS, resolveIcon } from "./icons";
import { useCatalog } from "./use-catalog";

const DEFAULT_VALUE = "default";
const CUSTOM_VALUE = "custom";

const PLACEHOLDERS: readonly { title: string; text: string; icon: Icon }[] = [
  { title: "Selection", text: "{selection}", icon: Icon.TextSelection },
  { title: "Clipboard", text: "{clipboard}", icon: Icon.Clipboard },
  { title: "Argument", text: '{argument name="tone"}', icon: Icon.TextInput },
  {
    title: "Argument With Options",
    text: '{argument name="tone" options="friendly, formal"}',
    icon: Icon.ChevronUpDown,
  },
  { title: "Snippet", text: '{snippet name=""}', icon: Icon.Snippets },
  { title: "Browser Tab", text: "{browser-tab}", icon: Icon.Globe },
  { title: "Date", text: "{date}", icon: Icon.Calendar },
  { title: "Time", text: "{time}", icon: Icon.Clock },
];

const REASONING_TITLES: Record<ReasoningLevel, string> = {
  default: "Default",
  off: "Off",
  low: "Low",
  medium: "Medium",
  high: "High",
};

const CREATIVITY_TITLES: Record<CreativityLevel, string> = {
  default: "Default",
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  maximum: "Maximum",
};

const OUTPUT_TITLES: Record<OutputMode, string> = {
  preview: "Open in Preview",
  replace: "Replace Selection",
  copy: "Copy to Clipboard",
  insertAfter: "Insert After Selection",
};

interface FormValues {
  name: string;
  icon: string;
  template: string;
  model: string;
  customModel: string;
  privacy: string;
  reasoning: string;
  creativity: string;
  tags: string[];
  newTags: string;
  output: string;
  highlightChanges: boolean;
  enabled: boolean;
}

function parseTags(selected: readonly string[], typed: string): string[] {
  const all = [...selected, ...typed.split(",").map((tag) => tag.trim())].filter((tag) => tag !== "");
  return [...new Set(all)];
}

interface PromptFormProps {
  /** Missing means a new prompt. */
  prompt?: PromptDef;
  knownTags: readonly string[];
  onSaved: () => void | Promise<void>;
}

export function PromptForm({ prompt, knownTags, onSaved }: PromptFormProps) {
  const { pop } = useNavigation();
  const { entries, favorites, isLoading } = useCatalog();
  const { data: settings } = usePromise(
    async () => ({
      snippetNames: (await getSnippets()).map((snippet) => snippet.name),
      defaultModel: await getDefaultModel(),
    }),
    [],
    { onError: (error) => showError("Cannot Load Settings", error) },
  );
  const snippetNames = useMemo(() => settings?.snippetNames ?? [], [settings]);
  const defaultModel = settings?.defaultModel;

  // Shown on the route that would run today. It may differ from the stored one after a key change.
  const [storedModel] = useState(() => (prompt?.model ? routeModel(prompt.model, getApiKeys()) : undefined));

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: {
      name: prompt?.name ?? "",
      icon: prompt?.icon ?? "Stars",
      template: prompt?.template ?? "{selection}",
      model: storedModel ? refKey(storedModel) : DEFAULT_VALUE,
      customModel: "",
      privacy: prompt?.privacy ?? DEFAULT_VALUE,
      reasoning: prompt?.reasoning ?? DEFAULT_VALUE,
      creativity: prompt?.creativity ?? DEFAULT_VALUE,
      tags: prompt?.tags ?? [],
      newTags: "",
      output: prompt?.output ?? "preview",
      highlightChanges: prompt?.highlightChanges ?? true,
      enabled: prompt?.enabled ?? true,
    },
    validation: {
      name: (value) => (value?.trim() ? undefined : "Required"),
      template: (value) => {
        const template = value ?? "";
        const draft = { template, output: "preview" as OutputMode, highlightChanges: false };
        return validatePromptDraft(draft, { snippetNames }).errors[0]?.message;
      },
      customModel: (value) => {
        if (values.model !== CUSTOM_VALUE) return undefined;
        return parseCustomModel(value ?? "") ? undefined : "Use provider:model-id";
      },
    },
    onSubmit: async (form) => {
      await save(form);
    },
  });

  const selectedModel = useMemo((): ModelRef | undefined => {
    if (values.model === DEFAULT_VALUE) return undefined;
    if (values.model === CUSTOM_VALUE) return parseCustomModel(values.customModel);
    return parseCustomModel(values.model);
  }, [values.model, values.customModel]);

  // Capabilities come from what will really run: the inherited default, on the route the keys select.
  const effectiveModel = selectedModel ?? (defaultModel && routeModel(defaultModel.ref, getApiKeys()));
  const entry = effectiveModel ? findEntry(entries, effectiveModel) : undefined;
  const reasoningLevels = selectedModel ? supportedReasoning(selectedModel, entry) : [];
  const reasoning = values.reasoning as ReasoningLevel;
  const effectiveReasoning = selectedModel ? reasoning : (defaultModel?.reasoning ?? "default");
  const showCreativity = !effectiveModel || supportsCreativity(effectiveModel, entry, effectiveReasoning);
  const { outputModes, canHighlight, hints } = useMemo(
    () => inspectTemplate(values.template, { snippetNames }),
    [values.template, snippetNames],
  );

  // A dropdown cannot show foreign values. Listing the stored model and the stored output mode keeps both intact when
  // the catalog changes or the template is briefly invalid while typing; `save` still validates the final combination.
  const storedKey = storedModel ? refKey(storedModel) : undefined;
  const storedIsListed = !storedKey || entries.some((candidate) => refKey(candidate.ref) === storedKey);
  const outputChoices = outputModes.includes(values.output as OutputMode)
    ? outputModes
    : [...outputModes, values.output as OutputMode];

  useEffect(() => {
    if (selectedModel && !reasoningLevels.includes(reasoning)) setValue("reasoning", DEFAULT_VALUE);
  }, [selectedModel, entry]);

  async function save(form: FormValues) {
    const model = selectedModel;
    const draft: PromptDraft = {
      name: form.name.trim(),
      icon: form.icon,
      template: form.template,
      model,
      // Kept for direct models too: a removed key can move this prompt to OpenRouter later.
      privacy: form.privacy === "strict" ? (form.privacy as PrivacyOverride) : undefined,
      // Back on the default model, the prompt inherits again and forgets its own level.
      reasoning: model ? (form.reasoning as ReasoningLevel) : "default",
      creativity: showCreativity ? (form.creativity as CreativityLevel) : "default",
      tags: parseTags(form.tags, form.newTags),
      output: form.output as OutputMode,
      highlightChanges: canHighlight && form.highlightChanges,
      enabled: form.enabled,
    };
    const checked = validatePromptDraft(draft, { snippetNames });
    if (!checked.ok) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot Save Prompt", message: checked.errors[0]?.message });
      return;
    }
    try {
      if (prompt) await updatePrompt(prompt.id, draft);
      else await createPrompt(draft);
      await onSaved();
      pop();
    } catch (error) {
      await showError("Cannot Save Prompt", error);
    }
  }

  const icons = prompt?.icon && !ICON_CHOICES.includes(prompt.icon) ? [prompt.icon, ...ICON_CHOICES] : ICON_CHOICES;

  // Rebuilt only when the catalog changes. Otherwise each keystroke would recreate hundreds of dropdown items.
  const modelSections = useMemo(
    () =>
      groupByFamily(entries, favorites).map((group) => (
        <Form.Dropdown.Section key={group.title} title={group.title}>
          {group.entries.map((candidate) => (
            <Form.Dropdown.Item
              key={refKey(candidate.ref)}
              value={refKey(candidate.ref)}
              title={candidate.displayName}
              keywords={[candidate.ref.modelId, candidate.family]}
            />
          ))}
        </Form.Dropdown.Section>
      )),
    [entries, favorites],
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={prompt ? `Edit ${prompt.name}` : "Create Prompt"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Prompt" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <ActionPanel.Submenu
            title="Insert Placeholder…"
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          >
            {PLACEHOLDERS.map((placeholder) => (
              <Action
                key={placeholder.title}
                title={placeholder.title}
                icon={placeholder.icon}
                // TextArea has no cursor API, so placeholders can only be appended.
                onAction={() => setValue("template", `${values.template}${placeholder.text}`)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Simplify" />
      <Form.Dropdown {...itemProps.icon} title="Icon">
        {icons.map((key) => (
          <Form.Dropdown.Item key={key} value={key} title={iconTitle(key)} icon={resolveIcon(key)} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        {...itemProps.template}
        title="Prompt"
        placeholder="Rewrite the following text: {selection}"
        info='Needs {selection}, {clipboard}, or {browser-tab}. Also available: {argument name="…"}, {snippet name="…"}, {date}, {time}, and modifiers such as {clipboard | trim}.'
      />
      {[...new Set(hints.map((hint) => hint.message))].map((message) => (
        <Form.Description key={message} text={message} />
      ))}
      <Form.Separator />
      <Form.Dropdown {...itemProps.model} title="Model">
        <Form.Dropdown.Item value={DEFAULT_VALUE} title="Default" />
        {storedKey && !storedIsListed && <Form.Dropdown.Item value={storedKey} title={storedModel?.modelId ?? ""} />}
        {modelSections}
        <Form.Dropdown.Item value={CUSTOM_VALUE} title="Custom Model ID…" />
      </Form.Dropdown>
      {values.model === CUSTOM_VALUE && (
        <Form.TextField {...itemProps.customModel} title="Custom Model" placeholder="openrouter:vendor/model-id" />
      )}
      {selectedModel && reasoningLevels.length > 1 && (
        <Form.Dropdown {...itemProps.reasoning} title="Reasoning">
          {reasoningLevels.map((level) => (
            <Form.Dropdown.Item key={level} value={level} title={REASONING_TITLES[level]} icon={LEVEL_ICONS[level]} />
          ))}
        </Form.Dropdown>
      )}
      {showCreativity && (
        <Form.Dropdown {...itemProps.creativity} title="Creativity">
          {(Object.keys(CREATIVITY_TITLES) as CreativityLevel[]).map((level) => (
            <Form.Dropdown.Item key={level} value={level} title={CREATIVITY_TITLES[level]} icon={LEVEL_ICONS[level]} />
          ))}
        </Form.Dropdown>
      )}
      {effectiveModel?.provider === "openrouter" && (
        <Form.Dropdown {...itemProps.privacy} title="Privacy">
          <Form.Dropdown.Item value="default" title="Use Global Setting" />
          <Form.Dropdown.Item value="strict" title="Always Strict" />
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.Dropdown {...itemProps.output} title="Output">
        {outputChoices.map((mode) => (
          <Form.Dropdown.Item key={mode} value={mode} title={OUTPUT_TITLES[mode]} />
        ))}
      </Form.Dropdown>
      {canHighlight && <Form.Checkbox {...itemProps.highlightChanges} label="Highlight Changes" />}
      <Form.TagPicker {...itemProps.tags} title="Tags">
        {[...new Set([...knownTags, ...(prompt?.tags ?? [])])].map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField {...itemProps.newTags} title="New Tags" placeholder="writing, work" />
      <Form.Checkbox {...itemProps.enabled} label="Enabled" />
    </Form>
  );
}
