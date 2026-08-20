import { Action, ActionPanel, Form, getPreferenceValues, Icon, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import type { Model, ModelHook, CSVPrompt } from "../../type";
import { parse } from "csv-parse/sync";
import { getMaxTokensForModel, MAX_NONSTREAMING_TOKENS, shortModelName, supportsTemperature } from "../../utils/models";
import { DEFAULT_MODEL } from "../../hooks/useModel";
// Shared with the YAML import gate so the two validators cannot drift — an import
// accepting a temperature this form rejects is the defect those constants exist to close.
import { TEMPERATURE_MAX, TEMPERATURE_MIN } from "../../utils/presetYaml";
import { showResolvedToast } from "../../utils/toast";

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();

  // Use first available model as default if no model is provided
  const defaultModelOption = model?.option ?? (use.models.option[0] || DEFAULT_MODEL.option);
  const [selectedModel, setSelectedModel] = useState(defaultModelOption);

  // Declared before useForm: the validators below close over these.
  const MODEL_OPTIONS = use.models.option;
  const AVAILABLE_MODELS = use.models.availableModels;

  // With streaming off, the SDK refuses any request whose projected runtime exceeds ten
  // minutes, so a higher ceiling here is silently clamped at request time. Say so rather
  // than letting the field advertise a limit the request won't honor.
  const modelCeiling = getMaxTokensForModel(selectedModel, AVAILABLE_MODELS);
  const isStreaming = getPreferenceValues<Preferences>().useStream;
  const maxTokensInfo = isStreaming
    ? `Maximum allowed: ${modelCeiling.toLocaleString()} tokens`
    : `Maximum allowed: ${modelCeiling.toLocaleString()} tokens, but responses are capped at ` +
      `${MAX_NONSTREAMING_TOKENS.toLocaleString()} because Stream Responses is turned off.`;

  const { handleSubmit, itemProps, setValue } = useForm<Model>({
    onSubmit: async (model) => {
      let updatedModel: Model = {
        ...model,
        updated_at: new Date().toISOString(),
      };
      updatedModel = {
        ...updatedModel,
        temperature: updatedModel.temperature,
      };
      // EXACTLY ONE source of toast feedback per branch — the two hooks differ in who
      // owns it, so the branches necessarily look different:
      //   - `use.models.update` (`src/hooks/useModel.tsx`) raises NO toast, so this form
      //     owns it and reports the result directly.
      //   - `use.models.add` raises its own Success toast internally, so this form must
      //     raise none. It previously showed a second, independent toast that was
      //     `Animated` and that nothing ever resolved — leaving a spinner running forever
      //     after a save that had actually succeeded. A toast lying about state.
      // Neither branch shows an Animated phase — both are LocalStorage writes with no
      // observable latency, and an Animated toast on one of these is the exact bug the
      // user caught live (`src/utils/toast.ts`).
      // Both branches must also AWAIT the mutation before `pop()`, so a failure surfaces
      // on this screen rather than after the view has already been dismissed.
      if (props.model) {
        await use.models.update({
          ...updatedModel,
          id: props.model.id,
          created_at: props.model.created_at,
        });
        await showResolvedToast({ title: "Preset updated", style: Toast.Style.Success });
      } else {
        await use.models.add({
          ...updatedModel,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        });
      }
      pop();
    },
    validation: {
      name: FormValidation.Required,
      temperature: (value) => {
        // The field is hidden for models that reject sampling parameters, so there is
        // nothing for the user to fix — don't block the form on it.
        if (!supportsTemperature(selectedModel)) {
          return undefined;
        }
        if (value === undefined || value === null || value === "") {
          return "Temperature is required";
        }
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return "Temperature must be a number";
        }
        if (numValue < TEMPERATURE_MIN) {
          return `Minimal value is ${TEMPERATURE_MIN}`;
        }
        if (numValue > TEMPERATURE_MAX) {
          return `Maximum value is ${TEMPERATURE_MAX}`;
        }
        return undefined; // Valid input
      },
      max_tokens: (value) => {
        if (value === undefined || value === null || value === "") {
          return "Max tokens is required";
        }
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return "Max tokens must be a number";
        }
        if (numValue % 1 !== 0) {
          return "Value must be an integer";
        }
        if (numValue < 0) {
          return "Minimal value is 0";
        }

        const maxAllowed = getMaxTokensForModel(selectedModel, AVAILABLE_MODELS);

        if (numValue > maxAllowed) {
          return `Maximum value is ${maxAllowed}`;
        }
        return undefined; // Valid input
      },
    },
    initialValues: {
      name:
        model?.name ??
        (use.models.availableModels.length > 0
          ? use.models.availableModels.find((m) => m.id === defaultModelOption)?.display_name || ""
          : ""),
      temperature: model?.temperature.toString() ?? "1",
      max_tokens: model?.max_tokens ?? getMaxTokensForModel(defaultModelOption, AVAILABLE_MODELS).toString(),
      option: defaultModelOption,
      prompt: model?.prompt ?? "You are a useful assistant",
      pinned: model?.pinned ?? false,
    },
  });

  // Helper to get display name for a model ID
  const getDisplayName = useCallback(
    (modelId: string): string => {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      return model?.display_name || modelId;
    },
    [AVAILABLE_MODELS],
  );

  // Helper to check if current name is a model display name
  const isNameAModelDisplayName = useCallback(
    (name: string): boolean => {
      return AVAILABLE_MODELS.some((m) => m.display_name === name);
    },
    [AVAILABLE_MODELS],
  );

  // Handle model selection
  const handleModelChange = useCallback(
    (newValue: string) => {
      setSelectedModel(newValue);
      setValue("option", newValue);

      // Get current name field value
      const currentName = itemProps.name.value;

      // Only update name if it's currently set to a model's display name (not custom)
      // This means: if user typed a custom name, we keep it. If it's auto-populated, we update it.
      if (currentName && (isNameAModelDisplayName(currentName) || currentName === "")) {
        const newDisplayName = getDisplayName(newValue);
        setValue("name", newDisplayName);
      }

      // Auto-populate max_tokens with the maximum allowed value for the selected model
      const maxTokens = getMaxTokensForModel(newValue, AVAILABLE_MODELS);
      setValue("max_tokens", maxTokens.toString());
    },
    [setValue, getDisplayName, isNameAModelDisplayName, itemProps.name],
  );

  const { isLoading, data } = useFetch<CSVPrompt[]>(
    "https://gist.githubusercontent.com/florisdobber/35f702f0bab6816ac847b182be6f4903/raw/2f6a8296dc5818d76ed594b318e064f9983e0715/prompts.csv",
    {
      parseResponse: async (response) => {
        const text = await response.text();
        return parse(text, {
          columns: true,
        });
      },
      keepPreviousData: true,
    },
  );

  const setPrompt = useCallback(
    (value: string) => {
      if (value !== "none") {
        setValue("prompt", value);
      }
    },
    [setValue],
  );

  const [showAnthropicPrompts, setShowAnthropicPrompts] = useState(false);

  return (
    <Form
      actions={
        <ActionPanel>
          {/* `Icon.Checkmark`, matching the Ask question form and the Recents rename form —
              `Icon.SaveDocument` (a document with a download arrow) reads as "save a file to
              disk", which is what Export History actually does, so using it here was
              misleading. The title follows the same create-vs-edit test the toast already
              uses, rather than a generic "Submit" for both. */}
          <Action.SubmitForm
            title={props.model ? "Update Preset" : "Create Preset"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
          <Action
            title={showAnthropicPrompts ? "Hide Anthropic Prompts" : "Show Anthropic Prompts"}
            icon={Icon.Book}
            onAction={() => setShowAnthropicPrompts((s) => !s)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Model" placeholder="Choose model option" {...itemProps.option} onChange={handleModelChange}>
        {MODEL_OPTIONS.map((option) => {
          const displayName = getDisplayName(option);
          return (
            <Form.Dropdown.Item value={option} title={`${shortModelName(displayName)} (${option})`} key={option} />
          );
        })}
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="Name your preset" {...itemProps.name} />
      {showAnthropicPrompts && (
        <Form.Dropdown
          id="template"
          title="Anthropic Prompts"
          isLoading={isLoading}
          defaultValue="none"
          onChange={setPrompt}
        >
          <Form.Dropdown.Item value="none" title="Choose an Anthropic Library Prompt" icon={Icon.Book} />
          {(data || []).map((prompt) => (
            <Form.Dropdown.Item value={prompt.prompt} title={prompt.name} key={prompt.prompt} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea title="Prompt" placeholder="Describe your prompt" {...itemProps.prompt} />
      {/* Sampling parameters were removed on Claude Opus 4.7 and later — offering the
          field on those models would guarantee a 400 on the first request. */}
      {supportsTemperature(selectedModel) ? (
        <Form.TextField
          title="Temperature"
          placeholder="Set your sampling temperature (0 - 1)"
          {...itemProps.temperature}
        />
      ) : (
        <Form.Description
          title="Temperature"
          text="Not supported by this model — steer its behavior with the prompt instead."
        />
      )}
      <Form.TextField
        title="Max token output"
        placeholder="Set the maximum number of tokens to generate"
        info={maxTokensInfo}
        {...itemProps.max_tokens}
      />
      {/* `label` is required by `Form.Checkbox` (unlike `title`), so it carries the text
          alone here — "Pinned  ☐ Pin preset" repeated the concept on both sides of the
          checkbox; dropping `title` leaves just "☐ Pin preset". */}
      {model?.id !== "default" && <Form.Checkbox label="Pin preset" {...itemProps.pinned} />}
    </Form>
  );
};
