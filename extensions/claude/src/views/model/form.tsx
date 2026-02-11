import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { Model, ModelHook, CSVPrompt } from "../../type";
import { parse } from "csv-parse/sync";

// Helper to determine max tokens for a model
function getMaxTokensForModel(modelId: string): number {
  // Check if it's a Claude 4+ model
  const isClaude4Plus =
    modelId.includes("-4-") ||
    modelId.startsWith("claude-haiku-4") ||
    modelId.startsWith("claude-sonnet-4") ||
    modelId.startsWith("claude-opus-4");

  if (isClaude4Plus) {
    // Opus 4+ models have 32K output limit
    if (modelId.includes("opus")) {
      return 32000;
    }
    // Haiku 4+ and Sonnet 4+ models have 64K output limit
    return 64000;
  }

  // Legacy Claude 3 models have 4096 token output limit
  return 4096;
}

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();

  // Use first available model as default if no model is provided
  const defaultModelOption = model?.option ?? (use.models.option[0] || "claude-3-5-haiku-20241022");
  const [selectedModel, setSelectedModel] = useState(defaultModelOption);

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
      if (props.model) {
        const toast = await showToast({
          title: "Update your model...",
          style: Toast.Style.Animated,
        });
        use.models.update({
          ...updatedModel,
          id: props.model.id,
          created_at: props.model.created_at,
        });
        toast.title = "Model updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Save your model...",
          style: Toast.Style.Animated,
        });
        use.models.add({
          ...updatedModel,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        });
        await showToast({
          title: "Model saved",
          style: Toast.Style.Animated,
        });
      }
      pop();
    },
    validation: {
      name: FormValidation.Required,
      temperature: (value) => {
        if (value === undefined || value === null || value === "") {
          return "Temperature is required";
        }
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return "Temperature must be a number";
        }
        if (numValue < 0) {
          return "Minimal value is 0";
        }
        if (numValue > 1) {
          return "Maximum value is 1";
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

        const maxAllowed = getMaxTokensForModel(selectedModel);

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
      max_tokens: model?.max_tokens ?? getMaxTokensForModel(defaultModelOption).toString(),
      option: defaultModelOption,
      prompt: model?.prompt ?? "You are a useful assistant",
      pinned: model?.pinned ?? false,
    },
  });

  const MODEL_OPTIONS = use.models.option;
  const AVAILABLE_MODELS = use.models.availableModels;

  // Helper to get display name for a model ID
  const getDisplayName = useCallback(
    (modelId: string): string => {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      return model?.display_name || modelId;
    },
    [AVAILABLE_MODELS]
  );

  // Helper to check if current name is a model display name
  const isNameAModelDisplayName = useCallback(
    (name: string): boolean => {
      return AVAILABLE_MODELS.some((m) => m.display_name === name);
    },
    [AVAILABLE_MODELS]
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
      const maxTokens = getMaxTokensForModel(newValue);
      setValue("max_tokens", maxTokens.toString());
    },
    [setValue, getDisplayName, isNameAModelDisplayName, itemProps.name]
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
    }
  );

  const setPrompt = useCallback(
    (value: string) => {
      if (value !== "none") {
        setValue("prompt", value);
      }
    },
    [setValue]
  );

  const [showAnthropicPrompts, setShowAnthropicPrompts] = useState(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action title="Show Anthropic Prompts" icon={Icon.Book} onAction={() => setShowAnthropicPrompts((s) => !s)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Model" placeholder="Choose model option" {...itemProps.option} onChange={handleModelChange}>
        {MODEL_OPTIONS.map((option) => {
          const displayName = getDisplayName(option);
          return <Form.Dropdown.Item value={option} title={`${displayName} (${option})`} key={option} />;
        })}
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="Name your model" {...itemProps.name} />
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
      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 1)"
        {...itemProps.temperature}
      />
      <Form.TextField
        title="Max token output"
        placeholder="Set the maximum number of tokens to generate"
        info={`Maximum allowed: ${getMaxTokensForModel(selectedModel).toLocaleString()} tokens`}
        {...itemProps.max_tokens}
      />
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
    </Form>
  );
};
