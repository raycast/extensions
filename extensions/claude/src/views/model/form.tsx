import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { Model, ModelHook, CSVPrompt } from "../../type";
import { parse } from "csv-parse/sync";

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();
  const [selectedModel, setSelectedModel] = useState(model?.option ?? "claude-3-5-haiku-latest");

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

        const maxAllowed = selectedModel.startsWith("claude-3-5") ? 8192 : 4096;

        if (numValue > maxAllowed) {
          return `Maximum value is ${maxAllowed}`;
        }
        return undefined; // Valid input
      },
    },
    initialValues: {
      name: model?.name ?? "",
      temperature: model?.temperature.toString() ?? "1",
      max_tokens: model?.max_tokens ?? "4096",
      option: model?.option ?? "claude-3-5-haiku-latest",
      prompt: model?.prompt ?? "",
      pinned: model?.pinned ?? false,
    },
  });

  const MODEL_OPTIONS = use.models.option;

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
        placeholder={`Set the maximum number of tokens to generate before stopping (0 - ${
          selectedModel.startsWith("claude-3-5") ? "8192" : "4096"
        })`}
        {...itemProps.max_tokens}
      />
      <Form.Dropdown
        title="Model"
        placeholder="Choose model option"
        {...itemProps.option}
        onChange={(newValue) => {
          setSelectedModel(newValue);
          setValue("option", newValue);
        }}
      >
        {MODEL_OPTIONS.map((option) => (
          <Form.Dropdown.Item value={option} title={option} key={option} />
        ))}
      </Form.Dropdown>
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
    </Form>
  );
};
